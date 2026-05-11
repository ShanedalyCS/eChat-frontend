import { useEffect, useId, useState } from "react"
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileDown,
  MapPin,
  PencilLine,
  Plus,
  Save,
  Trash2,
  Users,
} from "lucide-react"

import { Badge } from "../components/ui/badge"
import { Button } from "../components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card"
import { Checkbox } from "../components/ui/checkbox"
import { Input } from "../components/ui/input"
import { Label } from "../components/ui/label"
import { ScrollArea } from "../components/ui/scroll-area"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select"
import {
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table"
import { cn } from "~/lib/utils"

const API_BASE_URL = "http://localhost:8080"
const SESSION_STORAGE_KEY = "echat-defined-activity-sessions"
const SCHEDULE_DATE_ISO = "2025-07-28"
const SCHEDULE_DATE_LABEL = "Monday 28 July 2025"

const plannerSessions = {
  morning: {
    title: "Morning Activities",
    description: "Trips, lessons, and departures before lunch.",
    filename: "morning-activities-schedule.pdf",
  },
  afternoon: {
    title: "Afternoon Activities",
    description: "Trips, lessons, and departures after lunch.",
    filename: "afternoon-activities-schedule.pdf",
  },
} as const

type PlannerSessionKey = keyof typeof plannerSessions

type ActivityCatalogRecord = {
  id: number
  name: string
}

type GroupRecord = {
  id: number
  name: string
  center?: string
  numGroupLeaders: number
  numStudents: number
  arrivalDate?: string
  departureDate?: string
}

type StaffOption = {
  id: number
  firstName: string
  lastName: string
  center?: string
}

type DefinedActivityRecord = {
  id: number
  activityId: number | null
  activityName: string
  groupIds: number[]
  staffIds: number[]
  bookingTime: string
  departureTime: string
  meetingPoint: string
}

type ActivityCatalogPayload = {
  id: number
  name: string
}

type DefinedActivityPayload = {
  id: number
  activityId: number
  groupIds: number[]
  staffIds: number[]
  bookingTime?: string
  departureTime?: string
  meetingPoint: string
}

type ActivityPlan = {
  id: string
  definedActivityId: number | null
  activityId: number | null
  activityName: string
  selectedGroupIds: number[]
  selectedStaffIds: number[]
  bookingTime: string
  departureTime: string
  meetingPoint: string
  isDirty: boolean
}

type PlannerSessionState = {
  plans: ActivityPlan[]
  groupSearchByPlan: Record<string, string>
  staffSearchByPlan: Record<string, string>
  isConfirmed: boolean
  isSaving: boolean
  saveMessage: string | null
  saveError: string | null
}

type PlannerBootstrapData = {
  activities: ActivityCatalogRecord[]
  groups: GroupRecord[]
  staff: StaffOption[]
  definedActivities: DefinedActivityRecord[]
}

type LoadPlannerDataOptions = {
  preserveConfirmation?: boolean
  showLoadingState?: boolean
  confirmedOverrides?: Partial<Record<PlannerSessionKey, boolean>>
  saveMessages?: Partial<Record<PlannerSessionKey, string | null>>
  sessionOverridesByFingerprint?: Partial<Record<string, PlannerSessionKey>>
}

const meetingPointSuggestions = [
  "Alex Main School building",
  "Alexandra College Canteen",
  "Alexandra College Main School building",
  "Front Reception",
  "Bus Bay",
]

const timeSuggestions = [
  "08:30",
  "09:00",
  "09:15",
  "09:30",
  "10:00",
  "10:30",
  "11:00",
  "11:30",
  "12:00",
  "12:30",
  "13:00",
  "13:30",
  "14:00",
  "14:30",
  "15:00",
  "15:30",
  "16:00",
  "16:30",
  "17:00",
]

const emptyTimeValue = "__unset__"
const brandPrimaryButtonClass =
  "bg-emerald-800 text-white shadow-sm hover:bg-emerald-900"
const brandOutlineButtonClass =
  "border-emerald-200 bg-white text-emerald-900 hover:bg-emerald-50"
const brandCardClass =
  "border-emerald-100/90 bg-white/95 shadow-[0_18px_50px_-24px_rgba(6,78,59,0.3)]"
const brandMutedCardClass =
  "border-emerald-100/80 bg-[linear-gradient(180deg,rgba(248,250,247,0.96)_0%,rgba(241,247,242,0.96)_100%)] shadow-[0_16px_42px_-28px_rgba(6,78,59,0.22)]"
const brandInputClass =
  "border-emerald-100 bg-white/90 focus-visible:border-emerald-700 focus-visible:ring-emerald-700/15"
const brandSelectTriggerClass =
  "border-emerald-100 bg-white/90 focus-visible:border-emerald-700 focus-visible:ring-emerald-700/15"

let planSequence = 1

function createSessionState(): PlannerSessionState {
  return {
    plans: [],
    groupSearchByPlan: {},
    staffSearchByPlan: {},
    isConfirmed: false,
    isSaving: false,
    saveMessage: null,
    saveError: null,
  }
}

function createPlan(
  overrides: Partial<Omit<ActivityPlan, "id">> = {}
): ActivityPlan {
  return {
    id: `plan-${planSequence++}`,
    definedActivityId: null,
    activityId: null,
    activityName: "",
    selectedGroupIds: [],
    selectedStaffIds: [],
    bookingTime: "",
    departureTime: "",
    meetingPoint: "",
    isDirty: true,
    ...overrides,
  }
}

function asCount(value: number | string) {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : 0
}

function normalizeName(value: string) {
  return value.trim().toLowerCase()
}

function getStaffName(member: StaffOption) {
  return `${member.firstName} ${member.lastName}`.trim()
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : null
}

function toNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }

  return null
}

function toOptionalString(value: unknown) {
  if (typeof value === "string") {
    return value.trim()
  }

  return value == null ? "" : String(value).trim()
}

function unwrapCollection(value: unknown): unknown[] {
  if (Array.isArray(value)) {
    return value
  }

  const record = asRecord(value)

  if (!record) {
    return []
  }

  if (Array.isArray(record.data)) {
    return record.data
  }

  if (Array.isArray(record.items)) {
    return record.items
  }

  if (Array.isArray(record.content)) {
    return record.content
  }

  return []
}

function formatMinutesAsTime(minutes: number) {
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60

  return `${String(hours).padStart(2, "0")}:${String(remainingMinutes).padStart(2, "0")}`
}

function extractTimePortion(value: string | null | undefined) {
  const trimmed = (value ?? "").trim()

  if (!trimmed) {
    return ""
  }

  const isoMatch = trimmed.match(/T(\d{2}:\d{2})(?::\d{2}(?:\.\d+)?)?/)

  if (isoMatch) {
    return isoMatch[1]
  }

  const timeAtStartMatch = trimmed.match(/^(\d{1,2}:\d{2})(?::\d{2})?$/)

  if (timeAtStartMatch) {
    return timeAtStartMatch[1]
  }

  return trimmed
}

function extractIds(value: unknown) {
  const values = Array.isArray(value) ? value : []

  return Array.from(
    new Set(
      values
        .map((item) => {
          if (typeof item === "number" || typeof item === "string") {
            return toNumber(item)
          }

          const record = asRecord(item)
          return record ? toNumber(record.id) : null
        })
        .filter((id): id is number => id !== null)
    )
  )
}

function normalizeNumericIds(values: number[]) {
  return Array.from(
    new Set(
      values
        .map((value) => Number(value))
        .filter((value) => Number.isFinite(value))
    )
  )
}

function getNextNumericId(values: number[]) {
  if (values.length === 0) {
    return 1
  }

  return Math.max(...values) + 1
}

function normalizeActivityCatalogRecord(
  value: unknown
): ActivityCatalogRecord | null {
  const record = asRecord(value)

  if (!record) {
    return null
  }

  const id = toNumber(record.id)
  const name =
    toOptionalString(record.name) || toOptionalString(record.activityName)

  if (id === null || !name) {
    return null
  }

  return { id, name } satisfies ActivityCatalogRecord
}

function normalizeGroupRecord(value: unknown): GroupRecord | null {
  const record = asRecord(value)

  if (!record) {
    return null
  }

  const id = toNumber(record.id)
  const name = toOptionalString(record.name)

  if (id === null || !name) {
    return null
  }

  return {
    id,
    name,
    center: toOptionalString(record.center) || undefined,
    numGroupLeaders: toNumber(record.numGroupLeaders) ?? 0,
    numStudents: toNumber(record.numStudents) ?? 0,
    arrivalDate: toOptionalString(record.arrivalDate) || undefined,
    departureDate: toOptionalString(record.departureDate) || undefined,
  } satisfies GroupRecord
}

function normalizeStaffRecord(value: unknown): StaffOption | null {
  const record = asRecord(value)

  if (!record) {
    return null
  }

  const id = toNumber(record.id)
  const firstName = toOptionalString(record.firstName)
  const lastName = toOptionalString(record.lastName)

  if (id === null) {
    return null
  }

  return {
    id,
    firstName,
    lastName,
    center: toOptionalString(record.center) || undefined,
  } satisfies StaffOption
}

function normalizeDefinedActivityRecord(
  value: unknown
): DefinedActivityRecord | null {
  const record = asRecord(value)

  if (!record) {
    return null
  }

  const nestedActivity = asRecord(record.activity)
  const id = toNumber(record.id)
  const activityId = toNumber(record.activityId ?? nestedActivity?.id)

  if (id === null) {
    return null
  }

  return {
    id,
    activityId,
    activityName:
      toOptionalString(record.activityName) ||
      toOptionalString(record.name) ||
      toOptionalString(nestedActivity?.name),
    groupIds: extractIds(record.groupIds ?? record.groups),
    staffIds: extractIds(record.staffIds ?? record.staff),
    bookingTime: normalizeTimeForUi(toOptionalString(record.bookingTime)),
    departureTime: normalizeTimeForUi(toOptionalString(record.departureTime)),
    meetingPoint: toOptionalString(record.meetingPoint),
  } satisfies DefinedActivityRecord
}

function parseApiErrorMessage(data: unknown) {
  if (typeof data === "string" && data.trim().length > 0) {
    return data
  }

  const record = asRecord(data)

  if (!record) {
    return null
  }

  const message =
    toOptionalString(record.message) ||
    toOptionalString(record.error) ||
    toOptionalString(record.details)

  return message || null
}

async function requestApi(path: string, init?: RequestInit) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(init?.headers ?? {}),
    },
  })

  const text = await response.text()
  let data: unknown = null

  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = text
    }
  }

  if (!response.ok) {
    throw new Error(
      parseApiErrorMessage(data) ??
        `${init?.method ?? "GET"} ${path} failed with ${response.status}`
    )
  }

  return data
}

async function fetchPlannerBootstrapData(): Promise<PlannerBootstrapData> {
  const [activitiesData, definedActivitiesData, groupsData, staffData] =
    await Promise.all([
      requestApi("/activities"),
      requestApi("/definedactivities"),
      requestApi("/groups"),
      requestApi("/staff"),
    ])

  return {
    activities: unwrapCollection(activitiesData)
      .map(normalizeActivityCatalogRecord)
      .filter((record): record is ActivityCatalogRecord => Boolean(record)),
    definedActivities: unwrapCollection(definedActivitiesData)
      .map(normalizeDefinedActivityRecord)
      .filter((record): record is DefinedActivityRecord => Boolean(record)),
    groups: unwrapCollection(groupsData)
      .map(normalizeGroupRecord)
      .filter((record): record is GroupRecord => Boolean(record)),
    staff: unwrapCollection(staffData)
      .map(normalizeStaffRecord)
      .filter((record): record is StaffOption => Boolean(record)),
  }
}

function parseTimeToMinutes(value: string | null | undefined) {
  const trimmed = extractTimePortion(value).toLowerCase()

  if (!trimmed) {
    return null
  }

  const twentyFourHourMatch = trimmed.match(/^(\d{1,2}):(\d{2})$/)

  if (twentyFourHourMatch) {
    const hours = Number(twentyFourHourMatch[1])
    const minutes = Number(twentyFourHourMatch[2])

    if (hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60) {
      return hours * 60 + minutes
    }
  }

  const meridiemMatch = trimmed.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/)

  if (!meridiemMatch) {
    return null
  }

  let hours = Number(meridiemMatch[1])
  const minutes = Number(meridiemMatch[2] ?? "0")
  const meridiem = meridiemMatch[3]

  if (hours < 1 || hours > 12 || minutes < 0 || minutes > 59) {
    return null
  }

  if (meridiem === "pm" && hours !== 12) {
    hours += 12
  }

  if (meridiem === "am" && hours === 12) {
    hours = 0
  }

  return hours * 60 + minutes
}

function normalizeTimeForUi(value: string | null | undefined) {
  const minutes = parseTimeToMinutes(value)

  if (minutes === null) {
    return extractTimePortion(value)
  }

  return formatMinutesAsTime(minutes)
}

function toScheduleLocalDateTime(value: string | null | undefined) {
  const normalizedTime = normalizeTimeForUi(value)

  if (!normalizedTime) {
    return null
  }

  const minutes = parseTimeToMinutes(normalizedTime)

  if (minutes === null) {
    return null
  }

  return `${SCHEDULE_DATE_ISO}T${formatMinutesAsTime(minutes)}:00`
}

function buildActivityCatalogPayload(
  activityId: number,
  activityName: string
): ActivityCatalogPayload {
  return {
    id: activityId,
    name: activityName.trim(),
  }
}

function buildDefinedActivityPayload(
  plan: Pick<
    ActivityPlan,
    "selectedGroupIds" | "selectedStaffIds" | "bookingTime" | "departureTime" | "meetingPoint"
  >,
  definedActivityId: number,
  activityId: number
): DefinedActivityPayload {
  const bookingTime = toScheduleLocalDateTime(plan.bookingTime)
  const departureTime = toScheduleLocalDateTime(plan.departureTime)
  const payload: DefinedActivityPayload = {
    id: definedActivityId,
    activityId,
    groupIds: normalizeNumericIds(plan.selectedGroupIds),
    staffIds: normalizeNumericIds(plan.selectedStaffIds),
    meetingPoint: plan.meetingPoint.trim(),
  }

  if (bookingTime) {
    payload.bookingTime = bookingTime
  }

  if (departureTime) {
    payload.departureTime = departureTime
  }

  return payload
}

function getDefinedActivityFingerprint(input: {
  activityId: number | null
  groupIds: number[]
  staffIds: number[]
  bookingTime?: string | null
  departureTime?: string | null
  meetingPoint: string
}) {
  return JSON.stringify({
    activityId: input.activityId ?? null,
    groupIds: normalizeNumericIds(input.groupIds).sort((left, right) => left - right),
    staffIds: normalizeNumericIds(input.staffIds).sort((left, right) => left - right),
    bookingTime: normalizeTimeForUi(input.bookingTime),
    departureTime: normalizeTimeForUi(input.departureTime),
    meetingPoint: input.meetingPoint.trim().toLowerCase(),
  })
}

function inferSessionFromDefinedActivity(
  record: DefinedActivityRecord
): PlannerSessionKey {
  const minutes =
    parseTimeToMinutes(record.departureTime) ??
    parseTimeToMinutes(record.bookingTime)

  return minutes !== null && minutes >= 13 * 60 ? "afternoon" : "morning"
}

function readStoredSessionMap(): Record<string, PlannerSessionKey> {
  if (typeof window === "undefined") {
    return {}
  }

  try {
    const raw = window.localStorage.getItem(SESSION_STORAGE_KEY)

    if (!raw) {
      return {}
    }

    const parsed = JSON.parse(raw) as Record<string, unknown>

    return Object.fromEntries(
      Object.entries(parsed).filter(
        (entry): entry is [string, PlannerSessionKey] =>
          entry[1] === "morning" || entry[1] === "afternoon"
      )
    )
  } catch {
    return {}
  }
}

function writeStoredSessionMap(nextMap: Record<string, PlannerSessionKey>) {
  if (typeof window === "undefined") {
    return
  }

  window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(nextMap))
}

function storeDefinedActivitySession(
  definedActivityId: number,
  sessionKey: PlannerSessionKey
) {
  const currentMap = readStoredSessionMap()
  writeStoredSessionMap({
    ...currentMap,
    [String(definedActivityId)]: sessionKey,
  })
}

function removeStoredDefinedActivitySession(definedActivityId: number) {
  const currentMap = readStoredSessionMap()
  const nextMap = { ...currentMap }

  delete nextMap[String(definedActivityId)]
  writeStoredSessionMap(nextMap)
}

function buildSessionsFromDefinedActivities(
  records: DefinedActivityRecord[],
  catalog: ActivityCatalogRecord[],
  sessionOverridesByFingerprint: Partial<Record<string, PlannerSessionKey>> = {}
) {
  const activityCatalogById = new Map(catalog.map((activity) => [activity.id, activity]))
  const storedSessionMap = readStoredSessionMap()
  const nextSessions: Record<PlannerSessionKey, PlannerSessionState> = {
    morning: createSessionState(),
    afternoon: createSessionState(),
  }

  const sortedRecords = [...records].sort((left, right) => {
    const leftMinutes =
      parseTimeToMinutes(left.departureTime) ??
      parseTimeToMinutes(left.bookingTime) ??
      Number.POSITIVE_INFINITY
    const rightMinutes =
      parseTimeToMinutes(right.departureTime) ??
      parseTimeToMinutes(right.bookingTime) ??
      Number.POSITIVE_INFINITY

    if (leftMinutes !== rightMinutes) {
      return leftMinutes - rightMinutes
    }

    return left.activityName.localeCompare(right.activityName)
  })

  for (const record of sortedRecords) {
    const fingerprint = getDefinedActivityFingerprint(record)
    const sessionKey =
      storedSessionMap[String(record.id)] ??
      sessionOverridesByFingerprint[fingerprint] ??
      inferSessionFromDefinedActivity(record)

    const activityName =
      record.activityName ||
      (record.activityId !== null
        ? activityCatalogById.get(record.activityId)?.name ?? ""
        : "")

    nextSessions[sessionKey].plans.push(
      createPlan({
        definedActivityId: record.id,
        activityId: record.activityId,
        activityName,
        selectedGroupIds: record.groupIds,
        selectedStaffIds: record.staffIds,
        bookingTime: record.bookingTime,
        departureTime: record.departureTime,
        meetingPoint: record.meetingPoint,
        isDirty: false,
      })
    )

    storeDefinedActivitySession(record.id, sessionKey)
  }

  return nextSessions
}

function formatErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

export default function Activities() {
  const [activities, setActivities] = useState<ActivityCatalogRecord[]>([])
  const [groups, setGroups] = useState<GroupRecord[]>([])
  const [staff, setStaff] = useState<StaffOption[]>([])
  const [activityLibrarySearch, setActivityLibrarySearch] = useState("")
  const [sessions, setSessions] = useState<Record<PlannerSessionKey, PlannerSessionState>>({
    morning: createSessionState(),
    afternoon: createSessionState(),
  })
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const activityListId = useId()
  const meetingPointListId = useId()

  async function loadPlannerData(options: LoadPlannerDataOptions = {}) {
    const {
      preserveConfirmation = false,
      showLoadingState = true,
      confirmedOverrides = {},
      saveMessages = {},
      sessionOverridesByFingerprint = {},
    } = options

    if (showLoadingState) {
      setIsLoading(true)
    }

    try {
      const bootstrapData = await fetchPlannerBootstrapData()
      const hydratedSessions = buildSessionsFromDefinedActivities(
        bootstrapData.definedActivities,
        bootstrapData.activities,
        sessionOverridesByFingerprint
      )

      setActivities(bootstrapData.activities)
      setGroups(bootstrapData.groups)
      setStaff(bootstrapData.staff)
      setLoadError(null)
      setSessions((currentSessions) => ({
        morning: {
          ...hydratedSessions.morning,
          isConfirmed:
            confirmedOverrides.morning ??
            (preserveConfirmation ? currentSessions.morning.isConfirmed : false),
          isSaving: false,
          saveMessage:
            saveMessages.morning ??
            (preserveConfirmation ? currentSessions.morning.saveMessage : null),
          saveError: null,
        },
        afternoon: {
          ...hydratedSessions.afternoon,
          isConfirmed:
            confirmedOverrides.afternoon ??
            (preserveConfirmation ? currentSessions.afternoon.isConfirmed : false),
          isSaving: false,
          saveMessage:
            saveMessages.afternoon ??
            (preserveConfirmation ? currentSessions.afternoon.saveMessage : null),
          saveError: null,
        },
      }))

      return true
    } catch (error) {
      setLoadError(
        formatErrorMessage(
          error,
          "Planner data could not be loaded from the API."
        )
      )
      return false
    } finally {
      if (showLoadingState) {
        setIsLoading(false)
      }
    }
  }

  useEffect(() => {
    void loadPlannerData()
  }, [])

  function updateSession(
    sessionKey: PlannerSessionKey,
    updater: (session: PlannerSessionState) => PlannerSessionState
  ) {
    setSessions((currentSessions) => ({
      ...currentSessions,
      [sessionKey]: updater(currentSessions[sessionKey]),
    }))
  }

  function addBlankPlan(sessionKey: PlannerSessionKey) {
    updateSession(sessionKey, (session) => ({
      ...session,
      plans: [...session.plans, createPlan()],
      saveMessage: null,
      saveError: null,
    }))
  }

  function addPlanFromLibrary(
    sessionKey: PlannerSessionKey,
    activity: ActivityCatalogRecord
  ) {
    updateSession(sessionKey, (session) => {
      const alreadyExists = session.plans.some(
        (plan) =>
          plan.activityId === activity.id ||
          normalizeName(plan.activityName) === normalizeName(activity.name)
      )

      if (alreadyExists) {
        return {
          ...session,
          saveMessage: `${activity.name} is already in ${plannerSessions[sessionKey].title}.`,
          saveError: null,
        }
      }

      return {
        ...session,
        plans: [
          ...session.plans,
          createPlan({
            activityId: activity.id,
            activityName: activity.name,
          }),
        ],
        saveMessage: null,
        saveError: null,
      }
    })
  }

  async function removePlan(sessionKey: PlannerSessionKey, planId: string) {
    const session = sessions[sessionKey]
    const plan = session.plans.find((candidate) => candidate.id === planId)

    if (!plan) {
      return
    }

    if (plan.definedActivityId === null) {
      updateSession(sessionKey, (currentSession) => {
        const nextGroupSearch = { ...currentSession.groupSearchByPlan }
        const nextStaffSearch = { ...currentSession.staffSearchByPlan }

        delete nextGroupSearch[planId]
        delete nextStaffSearch[planId]

        return {
          ...currentSession,
          plans: currentSession.plans.filter((candidate) => candidate.id !== planId),
          groupSearchByPlan: nextGroupSearch,
          staffSearchByPlan: nextStaffSearch,
          saveMessage: "Draft activity removed.",
          saveError: null,
        }
      })

      return
    }

    updateSession(sessionKey, (currentSession) => ({
      ...currentSession,
      isSaving: true,
      saveMessage: null,
      saveError: null,
    }))

    try {
      await requestApi(`/deletedefinedactivity/${plan.definedActivityId}`, {
        method: "DELETE",
      })

      removeStoredDefinedActivitySession(plan.definedActivityId)

      updateSession(sessionKey, (currentSession) => {
        const nextGroupSearch = { ...currentSession.groupSearchByPlan }
        const nextStaffSearch = { ...currentSession.staffSearchByPlan }

        delete nextGroupSearch[planId]
        delete nextStaffSearch[planId]

        return {
          ...currentSession,
          isSaving: false,
          plans: currentSession.plans.filter((candidate) => candidate.id !== planId),
          groupSearchByPlan: nextGroupSearch,
          staffSearchByPlan: nextStaffSearch,
          saveMessage: "Saved activity removed.",
          saveError: null,
        }
      })
    } catch (error) {
      updateSession(sessionKey, (currentSession) => ({
        ...currentSession,
        isSaving: false,
        saveMessage: null,
        saveError: formatErrorMessage(
          error,
          "The activity could not be removed."
        ),
      }))
    }
  }

  function updatePlanField(
    sessionKey: PlannerSessionKey,
    planId: string,
    field: keyof Pick<
      ActivityPlan,
      "activityName" | "bookingTime" | "departureTime" | "meetingPoint"
    >,
    value: string
  ) {
    updateSession(sessionKey, (session) => ({
      ...session,
      plans: session.plans.map((plan) => {
        if (plan.id !== planId) {
          return plan
        }

        if (field === "activityName") {
          const matchedActivity =
            activities.find(
              (activity) =>
                normalizeName(activity.name) === normalizeName(value)
            ) ?? null

          return {
            ...plan,
            activityId: matchedActivity?.id ?? null,
            activityName: value,
            isDirty: true,
          }
        }

        return {
          ...plan,
          [field]: value,
          isDirty: true,
        }
      }),
      saveMessage: null,
      saveError: null,
    }))
  }

  function togglePlanGroup(
    sessionKey: PlannerSessionKey,
    planId: string,
    groupId: number,
    checked: boolean
  ) {
    updateSession(sessionKey, (session) => ({
      ...session,
      plans: session.plans.map((plan) => {
        if (plan.id !== planId) {
          return plan
        }

        return {
          ...plan,
          selectedGroupIds: checked
            ? [...new Set([...plan.selectedGroupIds, groupId])]
            : plan.selectedGroupIds.filter((id) => id !== groupId),
          isDirty: true,
        }
      }),
      saveMessage: null,
      saveError: null,
    }))
  }

  function togglePlanStaff(
    sessionKey: PlannerSessionKey,
    planId: string,
    staffId: number,
    checked: boolean
  ) {
    updateSession(sessionKey, (session) => ({
      ...session,
      plans: session.plans.map((plan) => {
        if (plan.id !== planId) {
          return plan
        }

        return {
          ...plan,
          selectedStaffIds: checked
            ? [...new Set([...plan.selectedStaffIds, staffId])]
            : plan.selectedStaffIds.filter((id) => id !== staffId),
          isDirty: true,
        }
      }),
      saveMessage: null,
      saveError: null,
    }))
  }

  function updatePlanSearch(
    sessionKey: PlannerSessionKey,
    planId: string,
    type: "group" | "staff",
    value: string
  ) {
    updateSession(sessionKey, (session) => {
      if (type === "group") {
        return {
          ...session,
          groupSearchByPlan: {
            ...session.groupSearchByPlan,
            [planId]: value,
          },
        }
      }

      return {
        ...session,
        staffSearchByPlan: {
          ...session.staffSearchByPlan,
          [planId]: value,
        },
      }
    })
  }

  function getSelectedGroups(plan: ActivityPlan) {
    return plan.selectedGroupIds
      .map((groupId) => groups.find((group) => group.id === groupId))
      .filter((group): group is GroupRecord => Boolean(group))
  }

  function getSelectedStaff(plan: ActivityPlan) {
    return plan.selectedStaffIds
      .map((staffId) => staff.find((member) => member.id === staffId))
      .filter((member): member is StaffOption => Boolean(member))
  }

  function getPlanTotals(plan: ActivityPlan) {
    return getSelectedGroups(plan).reduce(
      (totals, group) => ({
        students: totals.students + asCount(group.numStudents),
        leaders: totals.leaders + asCount(group.numGroupLeaders),
      }),
      { students: 0, leaders: 0 }
    )
  }

  function getPlannerSummary(sessionKey: PlannerSessionKey) {
    return sessions[sessionKey].plans.reduce(
      (totals, plan) => {
        const selectedGroups = getSelectedGroups(plan)
        const planTotals = getPlanTotals(plan)
        const hasName = normalizeName(plan.activityName).length > 0

        return {
          activities: totals.activities + (hasName ? 1 : 0),
          groupLines: totals.groupLines + selectedGroups.length,
          staffAssignments: totals.staffAssignments + plan.selectedStaffIds.length,
          students: totals.students + planTotals.students,
          leaders: totals.leaders + planTotals.leaders,
        }
      },
      {
        activities: 0,
        groupLines: 0,
        staffAssignments: 0,
        students: 0,
        leaders: 0,
      }
    )
  }

  function getCombinedPlannerSummary() {
    return (Object.keys(plannerSessions) as PlannerSessionKey[]).reduce(
      (totals, sessionKey) => {
        const sessionSummary = getPlannerSummary(sessionKey)

        return {
          activities: totals.activities + sessionSummary.activities,
          groupLines: totals.groupLines + sessionSummary.groupLines,
          staffAssignments:
            totals.staffAssignments + sessionSummary.staffAssignments,
          students: totals.students + sessionSummary.students,
          leaders: totals.leaders + sessionSummary.leaders,
        }
      },
      {
        activities: 0,
        groupLines: 0,
        staffAssignments: 0,
        students: 0,
        leaders: 0,
      }
    )
  }

  async function ensureActivityCatalogEntry(
    activityName: string,
    activityId: number | null,
    catalog: ActivityCatalogRecord[]
  ) {
    const normalizedName = normalizeName(activityName)

    if (!normalizedName) {
      throw new Error("Each activity row needs an activity name before saving.")
    }

    const matchedById =
      activityId !== null
        ? catalog.find((activity) => activity.id === activityId) ?? null
        : null

    if (
      matchedById &&
      normalizeName(matchedById.name) === normalizedName
    ) {
      return {
        activity: matchedById,
        catalog,
      }
    }

    const matchedByName =
      catalog.find(
        (activity) => normalizeName(activity.name) === normalizedName
      ) ?? null

    if (matchedByName) {
      return {
        activity: matchedByName,
        catalog,
      }
    }

    const nextActivityId = getNextNumericId(catalog.map((activity) => activity.id))

    await requestApi("/newactivity", {
      method: "POST",
      body: JSON.stringify(buildActivityCatalogPayload(nextActivityId, activityName)),
    })

    const refreshedCatalog = (await requestApi("/activities"))
    const normalizedCatalog = unwrapCollection(refreshedCatalog)
      .map(normalizeActivityCatalogRecord)
      .filter((record): record is ActivityCatalogRecord => Boolean(record))

    const createdActivity =
      normalizedCatalog.find(
        (activity) => normalizeName(activity.name) === normalizedName
      ) ?? null

    if (!createdActivity) {
      throw new Error(
        `The activity "${activityName}" was created, but the catalog did not return it afterwards.`
      )
    }

    setActivities(normalizedCatalog)

    return {
      activity: createdActivity,
      catalog: normalizedCatalog,
    }
  }

  async function saveSession(
    sessionKey: PlannerSessionKey,
    options: { confirmAfterSave?: boolean } = {}
  ) {
    const session = sessions[sessionKey]
    const namedPlans = session.plans.filter(
      (plan) => normalizeName(plan.activityName).length > 0
    )
    const dirtyNamedPlans = namedPlans.filter(
      (plan) => plan.isDirty || plan.definedActivityId === null
    )

    if (namedPlans.length === 0) {
      updateSession(sessionKey, (currentSession) => ({
        ...currentSession,
        saveMessage: "There are no activities to save in this section yet.",
        saveError: null,
      }))
      return true
    }

    if (dirtyNamedPlans.length === 0) {
      updateSession(sessionKey, (currentSession) => ({
        ...currentSession,
        isConfirmed: options.confirmAfterSave
          ? true
          : currentSession.isConfirmed,
        saveMessage: options.confirmAfterSave
          ? `${plannerSessions[sessionKey].title} confirmed.`
          : "Everything is already up to date.",
        saveError: null,
      }))
      return true
    }

    updateSession(sessionKey, (currentSession) => ({
      ...currentSession,
      isSaving: true,
      saveMessage: null,
      saveError: null,
    }))

    try {
      let currentCatalog = [...activities]
      let nextDefinedActivityId = getNextNumericId(
        (Object.keys(plannerSessions) as PlannerSessionKey[])
          .flatMap((key) => sessions[key].plans)
          .map((plan) => plan.definedActivityId)
          .filter((id): id is number => id !== null)
      )
      const sessionOverridesByFingerprint: Partial<
        Record<string, PlannerSessionKey>
      > = {}

      for (const plan of dirtyNamedPlans) {
        const { activity, catalog } = await ensureActivityCatalogEntry(
          plan.activityName,
          plan.activityId,
          currentCatalog
        )

        currentCatalog = catalog

        const definedActivityId =
          plan.definedActivityId ?? nextDefinedActivityId++
        const payload = buildDefinedActivityPayload(
          plan,
          definedActivityId,
          activity.id
        )

        sessionOverridesByFingerprint[
          getDefinedActivityFingerprint(payload)
        ] = sessionKey

        if (plan.definedActivityId === null) {
          const created = await requestApi("/newdefinedactivity", {
            method: "POST",
            body: JSON.stringify(payload),
          })
          const createdRecord = normalizeDefinedActivityRecord(created)

          if (createdRecord) {
            storeDefinedActivitySession(createdRecord.id, sessionKey)
          } else {
            storeDefinedActivitySession(definedActivityId, sessionKey)
          }
        } else {
          await requestApi(`/updatedefinedactivity/${plan.definedActivityId}`, {
            method: "PUT",
            body: JSON.stringify(payload),
          })
          storeDefinedActivitySession(plan.definedActivityId, sessionKey)
        }
      }

      const refreshed = await loadPlannerData({
        preserveConfirmation: true,
        showLoadingState: false,
        confirmedOverrides: options.confirmAfterSave
          ? { [sessionKey]: true }
          : undefined,
        saveMessages: {
          [sessionKey]: options.confirmAfterSave
            ? `${plannerSessions[sessionKey].title} saved and confirmed.`
            : `${plannerSessions[sessionKey].title} saved successfully.`,
        },
        sessionOverridesByFingerprint,
      })

      if (!refreshed) {
        throw new Error("The activities were saved, but the planner could not be refreshed afterwards.")
      }

      return true
    } catch (error) {
      updateSession(sessionKey, (currentSession) => ({
        ...currentSession,
        isSaving: false,
        saveMessage: null,
        saveError: formatErrorMessage(
          error,
          "The activities could not be saved."
        ),
      }))

      return false
    }
  }

  async function handleConfirmationToggle(sessionKey: PlannerSessionKey) {
    if (sessions[sessionKey].isConfirmed) {
      updateSession(sessionKey, (session) => ({
        ...session,
        isConfirmed: false,
        saveMessage: `${plannerSessions[sessionKey].title} reopened for editing.`,
        saveError: null,
      }))
      return
    }

    await saveSession(sessionKey, { confirmAfterSave: true })
  }

  async function exportSessionToPdf(sessionKey: PlannerSessionKey) {
    const session = sessions[sessionKey]
    const summary = getPlannerSummary(sessionKey)
    const exportablePlans = session.plans.filter(
      (plan) => normalizeName(plan.activityName).length > 0
    )

    if (!session.isConfirmed || exportablePlans.length === 0) {
      return
    }

    try {
      const [{ jsPDF }, { default: autoTable }] = await Promise.all([
        import("jspdf"),
        import("jspdf-autotable"),
      ])

      const doc = new jsPDF({
        orientation: "landscape",
        unit: "pt",
        format: "a4",
      })

      doc.setFontSize(22)
      doc.text(plannerSessions[sessionKey].title, 40, 42)
      doc.setFontSize(11)
      doc.setTextColor(90, 90, 90)
      doc.text(SCHEDULE_DATE_LABEL, 40, 62)
      doc.text("Confirmed schedule export", 40, 78)

      const summaryLabels = [
        ["Activities", String(summary.activities)],
        ["Groups", String(summary.groupLines)],
        ["Staff", String(summary.staffAssignments)],
        ["Students", String(summary.students)],
        ["Leaders", String(summary.leaders)],
      ] as const

      summaryLabels.forEach(([label, value], index) => {
        const startX = 40 + index * 148
        doc.setDrawColor(209, 213, 219)
        doc.rect(startX, 94, 132, 48)
        doc.setFontSize(10)
        doc.setTextColor(107, 114, 128)
        doc.text(label, startX + 10, 110)
        doc.setFontSize(18)
        doc.setTextColor(17, 24, 39)
        doc.text(value, startX + 10, 132)
      })

      autoTable(doc, {
        startY: 160,
        head: [[
          "Activity",
          "Groups",
          "Staff",
          "Booking",
          "Departure",
          "Meeting Point",
          "Students",
          "Leaders",
        ]],
        body: exportablePlans.map((plan) => {
          const selectedGroups = getSelectedGroups(plan)
          const selectedStaff = getSelectedStaff(plan)
          const totals = getPlanTotals(plan)

          return [
            plan.activityName,
            selectedGroups.length > 0
              ? selectedGroups
                  .map(
                    (group) =>
                      `${group.name} (${asCount(group.numStudents)} students, ${asCount(group.numGroupLeaders)} leaders${group.center ? `, ${group.center}` : ""})`
                  )
                  .join("\n")
              : "No groups selected",
            selectedStaff.length > 0
              ? selectedStaff.map(getStaffName).join(", ")
              : "No staff selected",
            plan.bookingTime || "-",
            plan.departureTime || "-",
            plan.meetingPoint || "-",
            String(totals.students),
            String(totals.leaders),
          ]
        }),
        margin: { left: 40, right: 40, bottom: 40 },
        styles: {
          fontSize: 9,
          cellPadding: 7,
          valign: "top",
          overflow: "linebreak",
        },
        headStyles: {
          fillColor: [243, 244, 246],
          textColor: [17, 24, 39],
          fontStyle: "bold",
        },
        columnStyles: {
          0: { cellWidth: 120 },
          1: { cellWidth: 190 },
          2: { cellWidth: 130 },
          3: { cellWidth: 62 },
          4: { cellWidth: 70 },
          5: { cellWidth: 150 },
          6: { cellWidth: 55 },
          7: { cellWidth: 55 },
        },
      })

      doc.save(plannerSessions[sessionKey].filename)
    } catch (error) {
      updateSession(sessionKey, (currentSession) => ({
        ...currentSession,
        saveMessage: null,
        saveError: formatErrorMessage(
          error,
          "PDF export failed. Check the console for details."
        ),
      }))
    }
  }

  function renderFinalScheduleSession(sessionKey: PlannerSessionKey) {
    const session = sessions[sessionKey]
    const summary = getPlannerSummary(sessionKey)
    const finalPlans = session.plans.filter(
      (plan) => normalizeName(plan.activityName).length > 0
    )

    return (
      <Card className={cn("overflow-hidden", brandCardClass)}>
        <CardHeader className="border-b border-emerald-100 bg-[linear-gradient(180deg,rgba(248,250,247,0.92)_0%,rgba(255,255,255,0.95)_100%)]">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <CardTitle className="text-emerald-950">
                {plannerSessions[sessionKey].title}
              </CardTitle>
              <CardDescription className="text-emerald-950/65">
                Final presentation version generated from the current saved planner state.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              {session.isConfirmed ? (
                <Badge variant="secondary" className="bg-emerald-900 text-white">
                  Confirmed
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="border-emerald-200 bg-white text-emerald-900"
                >
                  Draft
                </Badge>
              )}
              <Badge
                variant="outline"
                className="border-emerald-200 bg-white text-emerald-900"
              >
                {summary.activities} activities
              </Badge>
              <Badge
                variant="outline"
                className="border-emerald-200 bg-white text-emerald-900"
              >
                {summary.students} students
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <ScrollArea className="w-full">
            <div className="min-w-[1320px]">
              <table className="w-full caption-bottom text-sm">
                <TableHeader className="bg-[linear-gradient(180deg,#f6faf6_0%,#eef5ef_100%)]">
                  <TableRow className="border-emerald-100 hover:bg-transparent">
                    <TableHead className="w-[18rem] px-4 text-emerald-950">
                      Activity
                    </TableHead>
                    <TableHead className="min-w-[24rem] px-4 text-emerald-950">
                      Groups
                    </TableHead>
                    <TableHead className="min-w-[18rem] px-4 text-emerald-950">
                      Staff
                    </TableHead>
                    <TableHead className="w-[10rem] px-4 text-emerald-950">
                      Booking
                    </TableHead>
                    <TableHead className="w-[10rem] px-4 text-emerald-950">
                      Departure
                    </TableHead>
                    <TableHead className="min-w-[16rem] px-4 text-emerald-950">
                      Meeting Point
                    </TableHead>
                    <TableHead className="w-[8rem] px-4 text-emerald-950">
                      Students
                    </TableHead>
                    <TableHead className="w-[8rem] px-4 text-emerald-950">
                      Leaders
                    </TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {finalPlans.length > 0 ? (
                    finalPlans.map((plan) => {
                      const selectedGroups = getSelectedGroups(plan)
                      const selectedStaff = getSelectedStaff(plan)
                      const totals = getPlanTotals(plan)

                      return (
                        <TableRow
                          key={`final-${sessionKey}-${plan.id}`}
                          className="align-top border-emerald-100/80 hover:bg-emerald-50/30"
                        >
                          <TableCell className="px-4 py-4 whitespace-normal">
                            <div className="space-y-1">
                              <p className="text-sm font-semibold text-emerald-950">
                                {plan.activityName}
                              </p>
                              <p className="text-xs text-emerald-950/55">
                                {selectedGroups.length} groups assigned
                              </p>
                            </div>
                          </TableCell>

                          <TableCell className="px-4 py-4 whitespace-normal">
                            {selectedGroups.length > 0 ? (
                              <div className="space-y-2">
                                {selectedGroups.map((group) => (
                                  <div
                                    key={`final-group-${sessionKey}-${plan.id}-${group.id}`}
                                    className="rounded-xl border border-emerald-100 bg-white/80 p-3"
                                  >
                                    <div className="flex items-start justify-between gap-3">
                                      <div>
                                        <p className="text-sm font-medium text-emerald-950">
                                          {group.name}
                                        </p>
                                        {group.center ? (
                                          <p className="text-xs text-emerald-950/55">
                                            {group.center}
                                          </p>
                                        ) : null}
                                      </div>
                                      <div className="text-right text-xs text-emerald-950/70">
                                        <p>{asCount(group.numStudents)} students</p>
                                        <p>{asCount(group.numGroupLeaders)} leaders</p>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm text-emerald-950/55">
                                No groups selected
                              </p>
                            )}
                          </TableCell>

                          <TableCell className="px-4 py-4 whitespace-normal">
                            {selectedStaff.length > 0 ? (
                              <div className="flex flex-wrap gap-2">
                                {selectedStaff.map((member) => (
                                  <Badge
                                    key={`final-staff-${sessionKey}-${plan.id}-${member.id}`}
                                    variant="secondary"
                                    className="bg-emerald-900 text-white"
                                  >
                                    {getStaffName(member)}
                                  </Badge>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm text-emerald-950/55">
                                No staff selected
                              </p>
                            )}
                          </TableCell>

                          <TableCell className="px-4 py-4 align-middle text-sm font-medium text-emerald-950">
                            {plan.bookingTime || "-"}
                          </TableCell>
                          <TableCell className="px-4 py-4 align-middle text-sm font-medium text-emerald-950">
                            {plan.departureTime || "-"}
                          </TableCell>
                          <TableCell className="px-4 py-4 whitespace-normal text-sm text-emerald-950">
                            {plan.meetingPoint || "-"}
                          </TableCell>
                          <TableCell className="px-4 py-4 align-middle text-sm font-semibold text-emerald-950">
                            {totals.students}
                          </TableCell>
                          <TableCell className="px-4 py-4 align-middle text-sm font-semibold text-emerald-950">
                            {totals.leaders}
                          </TableCell>
                        </TableRow>
                      )
                    })
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        className="px-4 py-10 text-center text-emerald-950/60"
                      >
                        No activities configured for this session yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>

                <TableFooter className="bg-[linear-gradient(180deg,#f6faf6_0%,#eef5ef_100%)]">
                  <TableRow className="border-emerald-100 hover:bg-transparent">
                    <TableCell className="px-4 py-4 font-medium text-emerald-950">
                      Session totals
                    </TableCell>
                    <TableCell className="px-4 py-4 text-emerald-950/75">
                      {summary.groupLines} selected groups
                    </TableCell>
                    <TableCell className="px-4 py-4 text-emerald-950/75">
                      {summary.staffAssignments} staff assignments
                    </TableCell>
                    <TableCell className="px-4 py-4 text-emerald-950/75">-</TableCell>
                    <TableCell className="px-4 py-4 text-emerald-950/75">-</TableCell>
                    <TableCell className="px-4 py-4 text-emerald-950/75">
                      {summary.activities} activities
                    </TableCell>
                    <TableCell className="px-4 py-4 text-emerald-950/75">
                      {summary.students}
                    </TableCell>
                    <TableCell className="px-4 py-4 text-emerald-950/75">
                      {summary.leaders}
                    </TableCell>
                  </TableRow>
                </TableFooter>
              </table>
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    )
  }

  function renderPlannerSection(sessionKey: PlannerSessionKey) {
    const session = sessions[sessionKey]
    const summary = getPlannerSummary(sessionKey)
    const hasConfiguredPlans = summary.activities > 0
    const hasDirtyNamedPlans = session.plans.some(
      (plan) => normalizeName(plan.activityName).length > 0 && plan.isDirty
    )

    const plannerTable = (
      <ScrollArea className="h-[66vh] w-full">
        <div className="min-w-[1880px]">
          <table className="w-full caption-bottom text-sm">
            <TableHeader className="bg-[linear-gradient(180deg,#f6faf6_0%,#eef5ef_100%)]">
              <TableRow className="border-emerald-100 hover:bg-transparent">
                <TableHead className="w-[22rem] px-4 text-emerald-950">Activity</TableHead>
                <TableHead className="min-w-[32rem] px-4 text-emerald-950">Groups</TableHead>
                <TableHead className="min-w-[24rem] px-4 text-emerald-950">Staff</TableHead>
                <TableHead className="min-w-[20rem] px-4 text-emerald-950">Timing</TableHead>
                <TableHead className="min-w-[24rem] px-4 text-emerald-950">Meeting Point</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {session.plans.length > 0 ? (
                session.plans.map((plan) => {
                  const selectedGroups = getSelectedGroups(plan)
                  const selectedStaff = getSelectedStaff(plan)
                  const totals = getPlanTotals(plan)
                  const matchedActivity =
                    activities.find(
                      (activity) =>
                        normalizeName(activity.name) ===
                        normalizeName(plan.activityName)
                    ) ?? null
                  const groupSearch = session.groupSearchByPlan[plan.id] ?? ""
                  const staffSearch = session.staffSearchByPlan[plan.id] ?? ""
                  const filteredGroups = groups.filter((group) => {
                    const search = normalizeName(groupSearch)

                    if (!search) {
                      return true
                    }

                    return (
                      normalizeName(group.name).includes(search) ||
                      normalizeName(group.center ?? "").includes(search)
                    )
                  })
                  const filteredStaff = staff.filter((member) => {
                    const search = normalizeName(staffSearch)

                    if (!search) {
                      return true
                    }

                    return normalizeName(getStaffName(member)).includes(search)
                  })

                  return (
                    <TableRow key={plan.id} className="align-top">
                      <TableCell className="space-y-4 px-4 py-4 whitespace-normal">
                        <Card className={cn("shadow-none", brandMutedCardClass)}>
                          <CardHeader className="pb-3">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <CardTitle className="text-sm text-emerald-950">
                                  Activity
                                </CardTitle>
                                <CardDescription className="text-emerald-950/60">
                                  This row saves as a defined activity instance linked
                                  to a master activity record.
                                </CardDescription>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                className="text-emerald-900 hover:bg-emerald-100 hover:text-emerald-950"
                                onClick={() => void removePlan(sessionKey, plan.id)}
                                disabled={session.isConfirmed || session.isSaving}
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <Input
                              list={activityListId}
                              value={plan.activityName}
                              onChange={(event) =>
                                updatePlanField(
                                  sessionKey,
                                  plan.id,
                                  "activityName",
                                  event.target.value
                                )
                              }
                              placeholder="Choose existing or type a new catalog activity"
                              disabled={session.isConfirmed || session.isSaving}
                              className={cn("h-12 text-base", brandInputClass)}
                            />

                            <div className="flex flex-wrap gap-2">
                              {matchedActivity ? (
                                <Badge
                                  variant="secondary"
                                  className="bg-emerald-900 text-white"
                                >
                                  Linked to activity catalog
                                </Badge>
                              ) : normalizeName(plan.activityName) ? (
                                <Badge
                                  variant="outline"
                                  className="border-emerald-200 bg-white text-emerald-900"
                                >
                                  New catalog activity on save
                                </Badge>
                              ) : (
                                <Badge
                                  variant="outline"
                                  className="border-emerald-200 bg-white text-emerald-900"
                                >
                                  Unnamed
                                </Badge>
                              )}
                              {plan.definedActivityId !== null ? (
                                <Badge
                                  variant="outline"
                                  className="border-emerald-200 bg-white text-emerald-900"
                                >
                                  Saved instance #{plan.definedActivityId}
                                </Badge>
                              ) : (
                                <Badge
                                  variant="outline"
                                  className="border-amber-200 bg-amber-50 text-amber-900"
                                >
                                  Unsaved instance
                                </Badge>
                              )}
                              {plan.isDirty ? (
                                <Badge
                                  variant="outline"
                                  className="border-amber-200 bg-amber-50 text-amber-900"
                                >
                                  Pending changes
                                </Badge>
                              ) : (
                                <Badge
                                  variant="outline"
                                  className="border-emerald-200 bg-white text-emerald-900"
                                >
                                  Saved
                                </Badge>
                              )}
                            </div>

                            <div className="flex flex-wrap gap-2">
                              <Badge
                                variant="outline"
                                className="border-emerald-200 bg-white text-emerald-900"
                              >
                                {selectedGroups.length} groups
                              </Badge>
                              <Badge
                                variant="outline"
                                className="border-emerald-200 bg-white text-emerald-900"
                              >
                                {totals.students} students
                              </Badge>
                              <Badge
                                variant="outline"
                                className="border-emerald-200 bg-white text-emerald-900"
                              >
                                {totals.leaders} leaders
                              </Badge>
                            </div>
                          </CardContent>
                        </Card>
                      </TableCell>

                      <TableCell className="space-y-4 px-4 py-4 whitespace-normal">
                        <Card className={cn("h-full shadow-none", brandMutedCardClass)}>
                          <CardHeader className="pb-3">
                            <CardTitle className="text-sm text-emerald-950">
                              Select groups
                            </CardTitle>
                            <CardDescription className="text-emerald-950/60">
                              Group counts come directly from <code>/groups</code>.
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <Input
                              value={groupSearch}
                              onChange={(event) =>
                                updatePlanSearch(
                                  sessionKey,
                                  plan.id,
                                  "group",
                                  event.target.value
                                )
                              }
                              placeholder="Search groups"
                              className={brandInputClass}
                              disabled={session.isConfirmed || session.isSaving}
                            />

                            <ScrollArea className="h-52 pr-3">
                              <div className="space-y-2">
                                {filteredGroups.length > 0 ? (
                                  filteredGroups.map((group) => {
                                    const checked = plan.selectedGroupIds.includes(
                                      group.id
                                    )
                                    const checkboxId = `group-${sessionKey}-${plan.id}-${group.id}`

                                    return (
                                      <Label
                                        key={group.id}
                                        htmlFor={checkboxId}
                                        className="flex items-start gap-3 rounded-xl border border-emerald-100 bg-white/75 p-3 transition-colors hover:bg-emerald-50/70"
                                      >
                                        <Checkbox
                                          id={checkboxId}
                                          checked={checked}
                                          onCheckedChange={(value) =>
                                            togglePlanGroup(
                                              sessionKey,
                                              plan.id,
                                              group.id,
                                              value === true
                                            )
                                          }
                                          className="mt-0.5 border-emerald-300 data-checked:border-emerald-800 data-checked:bg-emerald-800"
                                          disabled={session.isConfirmed || session.isSaving}
                                        />
                                        <div className="space-y-1">
                                          <span className="text-sm font-medium leading-5 text-emerald-950">
                                            {group.name}
                                          </span>
                                          <p className="text-xs text-emerald-950/55">
                                            {asCount(group.numStudents)} students,{" "}
                                            {asCount(group.numGroupLeaders)} leaders
                                          </p>
                                        </div>
                                      </Label>
                                    )
                                  })
                                ) : (
                                  <div className="rounded-xl border border-dashed border-emerald-200 bg-white/70 p-4 text-sm text-emerald-950/60">
                                    No groups match your search.
                                  </div>
                                )}
                              </div>
                            </ScrollArea>

                            <div className="space-y-2">
                              {selectedGroups.length > 0 ? (
                                selectedGroups.map((group) => (
                                  <div
                                    key={group.id}
                                    className="grid gap-2 rounded-xl border border-emerald-100 bg-white/85 p-3 sm:grid-cols-[minmax(0,1fr)_90px_90px]"
                                  >
                                    <div>
                                      <p className="text-sm font-medium text-emerald-950">
                                        {group.name}
                                      </p>
                                      {group.center ? (
                                        <p className="text-xs text-emerald-950/55">
                                          {group.center}
                                        </p>
                                      ) : null}
                                    </div>
                                    <div>
                                      <p className="text-[11px] uppercase tracking-wide text-emerald-950/55">
                                        Students
                                      </p>
                                      <p className="text-sm font-semibold text-emerald-950">
                                        {asCount(group.numStudents)}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-[11px] uppercase tracking-wide text-emerald-950/55">
                                        Leaders
                                      </p>
                                      <p className="text-sm font-semibold text-emerald-950">
                                        {asCount(group.numGroupLeaders)}
                                      </p>
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <p className="text-sm text-emerald-950/55">
                                  No groups selected yet.
                                </p>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      </TableCell>

                      <TableCell className="px-4 py-4 whitespace-normal">
                        <Card className={cn("h-full shadow-none", brandMutedCardClass)}>
                          <CardHeader className="pb-3">
                            <CardTitle className="text-sm text-emerald-950">
                              Select staff
                            </CardTitle>
                            <CardDescription className="text-emerald-950/60">
                              Staff assignments save to <code>staffIds</code> on the
                              defined activity.
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <Input
                              value={staffSearch}
                              onChange={(event) =>
                                updatePlanSearch(
                                  sessionKey,
                                  plan.id,
                                  "staff",
                                  event.target.value
                                )
                              }
                              placeholder="Search staff"
                              className={brandInputClass}
                              disabled={session.isConfirmed || session.isSaving}
                            />

                            <ScrollArea className="h-52 pr-3">
                              <div className="space-y-2">
                                {filteredStaff.length > 0 ? (
                                  filteredStaff.map((member) => {
                                    const checked = plan.selectedStaffIds.includes(
                                      member.id
                                    )
                                    const checkboxId = `staff-${sessionKey}-${plan.id}-${member.id}`

                                    return (
                                      <Label
                                        key={member.id}
                                        htmlFor={checkboxId}
                                        className="flex items-start gap-3 rounded-xl border border-emerald-100 bg-white/75 p-3 transition-colors hover:bg-emerald-50/70"
                                      >
                                        <Checkbox
                                          id={checkboxId}
                                          checked={checked}
                                          onCheckedChange={(value) =>
                                            togglePlanStaff(
                                              sessionKey,
                                              plan.id,
                                              member.id,
                                              value === true
                                            )
                                          }
                                          className="mt-0.5 border-emerald-300 data-checked:border-emerald-800 data-checked:bg-emerald-800"
                                          disabled={session.isConfirmed || session.isSaving}
                                        />
                                        <div className="space-y-1">
                                          <span className="text-sm font-medium leading-5 text-emerald-950">
                                            {getStaffName(member)}
                                          </span>
                                          <p className="text-xs text-emerald-950/55">
                                            Available for assignment
                                          </p>
                                        </div>
                                      </Label>
                                    )
                                  })
                                ) : (
                                  <div className="rounded-xl border border-dashed border-emerald-200 bg-white/70 p-4 text-sm text-emerald-950/60">
                                    No staff match your search.
                                  </div>
                                )}
                              </div>
                            </ScrollArea>

                            <div className="flex flex-wrap gap-2">
                              {selectedStaff.length > 0 ? (
                                selectedStaff.map((member) => (
                                  <Badge
                                    key={member.id}
                                    variant="secondary"
                                    className="bg-emerald-900 text-white"
                                  >
                                    {getStaffName(member)}
                                  </Badge>
                                ))
                              ) : (
                                <p className="text-sm text-emerald-950/55">
                                  No staff selected yet.
                                </p>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      </TableCell>

                      <TableCell className="px-4 py-4 whitespace-normal">
                        <Card className={cn("h-full min-w-[20rem] shadow-none", brandCardClass)}>
                          <CardHeader className="pb-3">
                            <CardTitle className="flex items-center gap-2 text-sm text-emerald-950">
                              <Clock3 className="size-4" />
                              Timing
                            </CardTitle>
                            <CardDescription className="text-emerald-950/60">
                              Saved to the defined activity as booking and departure times.
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="grid gap-3">
                            <Select
                              value={plan.bookingTime || emptyTimeValue}
                              onValueChange={(value) =>
                                updatePlanField(
                                  sessionKey,
                                  plan.id,
                                  "bookingTime",
                                  value === emptyTimeValue ? "" : value
                                )
                              }
                              disabled={session.isConfirmed || session.isSaving}
                            >
                              <SelectTrigger
                                className={cn("h-12 w-full text-base", brandSelectTriggerClass)}
                              >
                                <SelectValue placeholder="Booking time" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value={emptyTimeValue}>
                                  No booking time
                                </SelectItem>
                                {timeSuggestions.map((time) => (
                                  <SelectItem key={`booking-${time}`} value={time}>
                                    {time}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>

                            <Select
                              value={plan.departureTime || emptyTimeValue}
                              onValueChange={(value) =>
                                updatePlanField(
                                  sessionKey,
                                  plan.id,
                                  "departureTime",
                                  value === emptyTimeValue ? "" : value
                                )
                              }
                              disabled={session.isConfirmed || session.isSaving}
                            >
                              <SelectTrigger
                                className={cn("h-12 w-full text-base", brandSelectTriggerClass)}
                              >
                                <SelectValue placeholder="Departure time" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value={emptyTimeValue}>
                                  No departure time
                                </SelectItem>
                                {timeSuggestions.map((time) => (
                                  <SelectItem key={`departure-${time}`} value={time}>
                                    {time}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </CardContent>
                        </Card>
                      </TableCell>

                      <TableCell className="px-4 py-4 whitespace-normal">
                        <Card className={cn("h-full min-w-[24rem] shadow-none", brandCardClass)}>
                          <CardHeader className="pb-3">
                            <CardTitle className="flex items-center gap-2 text-sm text-emerald-950">
                              <MapPin className="size-4" />
                              Meeting Point
                            </CardTitle>
                            <CardDescription className="text-emerald-950/60">
                              Saved to the defined activity as its meeting point.
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <Input
                              list={meetingPointListId}
                              value={plan.meetingPoint}
                              onChange={(event) =>
                                updatePlanField(
                                  sessionKey,
                                  plan.id,
                                  "meetingPoint",
                                  event.target.value
                                )
                              }
                              placeholder="Choose or type a location"
                              disabled={session.isConfirmed || session.isSaving}
                              className={cn("h-12 text-base", brandInputClass)}
                            />
                          </CardContent>
                        </Card>
                      </TableCell>
                    </TableRow>
                  )
                })
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="px-4 py-10 text-center text-emerald-950/60"
                  >
                    <div className="flex flex-col items-center gap-3">
                      <p>
                        Add a row here or use the shared activity library above to
                        start the {plannerSessions[sessionKey].title.toLowerCase()} planner.
                      </p>
                      <Button
                        onClick={() => addBlankPlan(sessionKey)}
                        className={cn("gap-2", brandPrimaryButtonClass)}
                        disabled={session.isConfirmed || session.isSaving}
                      >
                        <Plus className="size-4" />
                        Add First Activity
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>

            <TableFooter className="bg-[linear-gradient(180deg,#f6faf6_0%,#eef5ef_100%)]">
              <TableRow className="border-emerald-100 hover:bg-transparent">
                <TableCell className="px-4 py-4 whitespace-normal">
                  <div className="flex items-center gap-2 font-medium text-emerald-950">
                    <Users className="size-4" />
                    Planner totals
                  </div>
                </TableCell>
                <TableCell className="px-4 py-4 whitespace-normal text-emerald-950/75">
                  {summary.groupLines} selected group rows
                </TableCell>
                <TableCell className="px-4 py-4 whitespace-normal text-emerald-950/75">
                  {summary.staffAssignments} staff assignments
                </TableCell>
                <TableCell className="px-4 py-4 whitespace-normal text-emerald-950/75">
                  {summary.students} students
                </TableCell>
                <TableCell className="px-4 py-4 whitespace-normal text-emerald-950/75">
                  {summary.leaders} leaders
                </TableCell>
              </TableRow>
            </TableFooter>
          </table>
        </div>
      </ScrollArea>
    )

    return (
      <section className="space-y-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="secondary"
                className={cn(
                  "text-white",
                  sessionKey === "morning" ? "bg-emerald-900" : "bg-amber-700"
                )}
              >
                {plannerSessions[sessionKey].title}
              </Badge>
              {session.isConfirmed ? (
                <Badge variant="secondary" className="bg-emerald-900 text-white">
                  Schedule confirmed
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="border-emerald-200 bg-white text-emerald-900"
                >
                  Draft schedule
                </Badge>
              )}
            </div>

            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-emerald-950">
              {plannerSessions[sessionKey].title}
            </h2>
            <p className="mt-2 text-sm leading-6 text-emerald-950/65">
              {plannerSessions[sessionKey].description}
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              <Badge
                variant="outline"
                className="border-emerald-200 bg-white text-emerald-900"
              >
                {summary.activities} activities
              </Badge>
              <Badge
                variant="outline"
                className="border-emerald-200 bg-white text-emerald-900"
              >
                {summary.groupLines} groups
              </Badge>
              <Badge
                variant="outline"
                className="border-emerald-200 bg-white text-emerald-900"
              >
                {summary.staffAssignments} staff
              </Badge>
              <Badge
                variant="outline"
                className="border-emerald-200 bg-white text-emerald-900"
              >
                {summary.students} students
              </Badge>
              <Badge
                variant="outline"
                className="border-emerald-200 bg-white text-emerald-900"
              >
                {summary.leaders} leaders
              </Badge>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 xl:justify-end">
            <Button
              onClick={() => addBlankPlan(sessionKey)}
              className={cn("gap-2", brandPrimaryButtonClass)}
              disabled={session.isConfirmed || session.isSaving}
            >
              <Plus className="size-4" />
              Add Activity Row
            </Button>
            <Button
              variant="outline"
              className={cn("gap-2", brandOutlineButtonClass)}
              onClick={() => void saveSession(sessionKey)}
              disabled={session.isSaving || !hasDirtyNamedPlans}
            >
              <Save className="size-4" />
              {session.isSaving ? "Saving..." : "Save Changes"}
            </Button>
            <Button
              variant={session.isConfirmed ? "secondary" : "default"}
              className={cn(
                "gap-2",
                session.isConfirmed
                  ? "bg-amber-100 text-amber-950 hover:bg-amber-200"
                  : brandPrimaryButtonClass
              )}
              onClick={() => void handleConfirmationToggle(sessionKey)}
              disabled={session.isSaving || !hasConfiguredPlans}
            >
              {session.isConfirmed ? (
                <>
                  <PencilLine className="size-4" />
                  Edit Schedule
                </>
              ) : (
                <>
                  <CheckCircle2 className="size-4" />
                  Save & Confirm
                </>
              )}
            </Button>
            <Button
              variant="outline"
              className={cn("gap-2", brandOutlineButtonClass)}
              onClick={() => void exportSessionToPdf(sessionKey)}
              disabled={session.isSaving || !session.isConfirmed || !hasConfiguredPlans}
            >
              <FileDown className="size-4" />
              Export PDF
            </Button>
          </div>
        </div>

        {session.saveError ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {session.saveError}
          </div>
        ) : null}

        {session.saveMessage ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            {session.saveMessage}
          </div>
        ) : null}

        <div className={cn("overflow-hidden rounded-[1.75rem]", brandCardClass)}>
          <div className="border-b border-emerald-100 bg-[linear-gradient(180deg,rgba(248,250,247,0.9)_0%,rgba(255,255,255,0.94)_100%)] px-6 py-4">
            <p className="text-sm text-emerald-950/65">
              This section edits saved defined activity instances. Morning and
              Afternoon remain frontend headings because the backend scheduled
              activity model does not include an explicit time-of-day field.
            </p>
          </div>
          {plannerTable}
        </div>
      </section>
    )
  }

  const dailySummary = getCombinedPlannerSummary()
  const filteredLibraryActivities = activities.filter((activity) =>
    normalizeName(activity.name).includes(normalizeName(activityLibrarySearch))
  )

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(5,150,105,0.14),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(180,83,9,0.08),transparent_24%),linear-gradient(180deg,#f8faf7_0%,#eef4ef_52%,#f7f5ef_100%)]">
      <section className="mx-auto flex max-w-[1880px] flex-col gap-6 px-4 py-6 md:px-6 md:py-8">
        <div className="overflow-hidden rounded-[2rem] border border-emerald-900/10 bg-[linear-gradient(135deg,#0b3b2e_0%,#0f5a44_44%,#15684d_100%)] px-6 py-7 text-white shadow-[0_24px_70px_-30px_rgba(6,78,59,0.65)] md:px-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex items-center rounded-full border border-white/15 bg-white/8 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-emerald-50">
                Emerald Cultural Institute
              </div>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">
                Activities Planner
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-emerald-50/80 md:text-base">
                The planner now follows the backend split properly: the master
                activity catalog comes from <code>/activities</code>, and the
                actual scheduled rows are saved as defined activities through
                <code>/definedactivities</code>.
              </p>
            </div>
            <div className="md:text-right">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-emerald-100/70">
                Experience Tradition, Embrace Innovation
              </p>
              <p className="mt-2 text-sm text-emerald-50/80">
                {SCHEDULE_DATE_LABEL}
              </p>
            </div>
          </div>
        </div>

        {loadError ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {loadError}
          </div>
        ) : null}

        <Card className={cn("overflow-hidden", brandCardClass)}>
          <CardHeader className="border-b border-emerald-100 bg-[linear-gradient(180deg,rgba(248,250,247,0.92)_0%,rgba(255,255,255,0.95)_100%)]">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <CardTitle className="text-emerald-950">Daily Planner Workspace</CardTitle>
                <CardDescription className="text-emerald-950/65">
                  One shared activity library above, two saved planner sections
                  below, and all scheduled activity rows persisted through the
                  backend.
                </CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge
                  variant="outline"
                  className="border-emerald-200 bg-white text-emerald-900"
                >
                  2 planner headings
                </Badge>
                <Badge
                  variant="outline"
                  className="border-emerald-200 bg-white text-emerald-900"
                >
                  {dailySummary.activities} total activities
                </Badge>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-10 p-6 md:p-8">
            <div className="space-y-4 rounded-[1.75rem] border border-emerald-100 bg-[linear-gradient(180deg,rgba(248,250,247,0.96)_0%,rgba(255,255,255,0.92)_100%)] p-5 md:p-6">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                <div>
                  <CardTitle className="text-emerald-950">Activity Library</CardTitle>
                  <CardDescription className="mt-1 text-emerald-950/65">
                    The catalog comes from <code>/activities</code>. Add an
                    existing activity to Morning or Afternoon, or add a blank
                    row below and type a new one to create it on save.
                  </CardDescription>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    variant={loadError ? "destructive" : "secondary"}
                    className={!loadError ? "bg-emerald-100 text-emerald-900" : undefined}
                  >
                    {loadError
                      ? "API unavailable"
                      : isLoading
                        ? "Loading"
                        : `${activities.length} catalog activities`}
                  </Badge>
                  <Badge
                    variant="outline"
                    className="border-emerald-200 bg-white/80 text-emerald-900"
                  >
                    <CalendarDays className="mr-1 size-3.5" />
                    {SCHEDULE_DATE_LABEL}
                  </Badge>
                </div>
              </div>

              <Input
                value={activityLibrarySearch}
                onChange={(event) => setActivityLibrarySearch(event.target.value)}
                placeholder="Search activity catalog"
                className={cn("lg:max-w-md", brandInputClass)}
              />

              <ScrollArea className="w-full">
                {filteredLibraryActivities.length > 0 ? (
                  <div className="flex min-w-max gap-3 pb-4">
                    {filteredLibraryActivities.map((activity) => {
                      const alreadyAddedMorning = sessions.morning.plans.some(
                        (plan) =>
                          normalizeName(plan.activityName) ===
                          normalizeName(activity.name)
                      )
                      const alreadyAddedAfternoon = sessions.afternoon.plans.some(
                        (plan) =>
                          normalizeName(plan.activityName) ===
                          normalizeName(activity.name)
                      )

                      return (
                        <div
                          key={activity.id}
                          className="flex w-[320px] shrink-0 flex-col justify-between gap-4 rounded-[1.4rem] border border-emerald-100 bg-white/92 p-4 shadow-sm"
                        >
                          <div className="space-y-2">
                            <p className="text-sm font-medium leading-5 text-emerald-950">
                              {activity.name}
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {alreadyAddedMorning ? (
                                <Badge
                                  variant="outline"
                                  className="border-emerald-200 bg-emerald-50 text-emerald-900"
                                >
                                  In Morning
                                </Badge>
                              ) : null}
                              {alreadyAddedAfternoon ? (
                                <Badge
                                  variant="outline"
                                  className="border-amber-200 bg-amber-50 text-amber-900"
                                >
                                  In Afternoon
                                </Badge>
                              ) : null}
                              {!alreadyAddedMorning && !alreadyAddedAfternoon ? (
                                <p className="text-xs text-emerald-950/55">
                                  Available to add
                                </p>
                              ) : null}
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className={brandOutlineButtonClass}
                              disabled={
                                alreadyAddedMorning ||
                                sessions.morning.isConfirmed ||
                                sessions.morning.isSaving
                              }
                              onClick={() => addPlanFromLibrary("morning", activity)}
                            >
                              Morning
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className={brandOutlineButtonClass}
                              disabled={
                                alreadyAddedAfternoon ||
                                sessions.afternoon.isConfirmed ||
                                sessions.afternoon.isSaving
                              }
                              onClick={() => addPlanFromLibrary("afternoon", activity)}
                            >
                              Afternoon
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-emerald-200 bg-white/75 p-4 text-sm text-emerald-950/60">
                    No activities match your search.
                  </div>
                )}
              </ScrollArea>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              <Card className={brandCardClass}>
                <CardHeader className="pb-3">
                  <CardDescription className="text-emerald-950/60">Activities</CardDescription>
                  <CardTitle className="text-3xl text-emerald-950">
                    {dailySummary.activities}
                  </CardTitle>
                </CardHeader>
              </Card>
              <Card className={brandCardClass}>
                <CardHeader className="pb-3">
                  <CardDescription className="text-emerald-950/60">Groups</CardDescription>
                  <CardTitle className="text-3xl text-emerald-950">
                    {dailySummary.groupLines}
                  </CardTitle>
                </CardHeader>
              </Card>
              <Card className={brandCardClass}>
                <CardHeader className="pb-3">
                  <CardDescription className="text-emerald-950/60">Staff</CardDescription>
                  <CardTitle className="text-3xl text-emerald-950">
                    {dailySummary.staffAssignments}
                  </CardTitle>
                </CardHeader>
              </Card>
              <Card className={brandCardClass}>
                <CardHeader className="pb-3">
                  <CardDescription className="text-emerald-950/60">Students</CardDescription>
                  <CardTitle className="text-3xl text-emerald-950">
                    {dailySummary.students}
                  </CardTitle>
                </CardHeader>
              </Card>
              <Card className={brandCardClass}>
                <CardHeader className="pb-3">
                  <CardDescription className="text-emerald-950/60">Leaders</CardDescription>
                  <CardTitle className="text-3xl text-emerald-950">
                    {dailySummary.leaders}
                  </CardTitle>
                </CardHeader>
              </Card>
            </div>

            <div className="space-y-10">
              {renderPlannerSection("morning")}
              <div className="border-t border-emerald-100" />
              {renderPlannerSection("afternoon")}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <div className="max-w-3xl">
            <h2 className="text-2xl font-semibold tracking-tight text-emerald-950">
              Final Schedule
            </h2>
            <p className="mt-2 text-sm leading-6 text-emerald-950/65">
              Read-only presentation view for the full day. Morning and
              Afternoon stay together here as well, but each section still
              reflects its own saved defined activity instances.
            </p>
          </div>

          <div className="space-y-6">
            {renderFinalScheduleSession("morning")}
            {renderFinalScheduleSession("afternoon")}
          </div>
        </div>
      </section>

      <datalist id={activityListId}>
        {activities.map((activity) => (
          <option key={activity.id} value={activity.name} />
        ))}
      </datalist>

      <datalist id={meetingPointListId}>
        {meetingPointSuggestions.map((point) => (
          <option key={point} value={point} />
        ))}
      </datalist>
    </main>
  )
}
