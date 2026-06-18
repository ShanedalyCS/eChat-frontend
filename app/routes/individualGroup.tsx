import { useEffect, useState } from "react";
import { useParams } from "react-router";
import Header from "~/components/header";
import { Button } from "~/components/ui/button";
import "../custom.css";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
type Group = {
  id: number;
  name: string;
  center: string;
  numGroupLeaders: number;
  numStudents: number;
  arrivalDate: string;
  departureDate: string;
};

type Student = {
  id: number;
  firstName: string;
  lastName: string;
  age: number;
  gender: string;
  program: string;
  arrivalDate: string;
  departureDate: string;
};

type GroupLeader = {
  id: number;
  firstName: string;
  lastName: string;
  age: number;
  gender: string;
  center: string;
  groupId: number;
  arrivalDate: string;
  departureDate: string;
};

export default function IndividualGroup() {
  const { groupId } = useParams();
  const [group, setGroup] = useState<Group | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [groupLeaders, setGroupLeaders] = useState<GroupLeader[]>([]);

  useEffect(() => {
    if (!groupId) return;

    async function fetchGroup() {
      try {
        const response = await fetch(`http://localhost:8080/groups/${groupId}`);
        const data = await response.json();
        setGroup(data);
        console.log("Fetched group:", data);
      } catch (error) {
        console.error("Failed to fetch group:", error);
      }
    }
    fetchGroup();
  }, [groupId]);


  useEffect(() => {
    if (!groupId) return;

    async function fetchStudents() {
      try {
        const response = await fetch(`http://localhost:8080/group/${groupId}/students`);
        const data = await response.json();
        setStudents(data);
        console.log("Fetched students:", data);
      } catch (error) {
        console.error("Failed to fetch students:", error);
      }
    }
    fetchStudents();
  }, [groupId]);

  useEffect(() => {
    if (!groupId) return;

    async function fetchGroupLeaders() {
      try {
        const response = await fetch(`http://localhost:8080/group/${groupId}/groupleaders`);
        const data = await response.json();
        setGroupLeaders(data);
        console.log("Fetched group leaders:", data);
      } catch (error) {
        console.error("Failed to fetch group leaders:", error);
      }
    }
    fetchGroupLeaders();
  }, [groupId]);

  return (
  <>
    <Header />
    <a href="/groups">Back</a>
    <div className="individual-group-container">
      <h1 className="individual-group-title">{group?.name} ({group?.id})</h1>
      <p>Center: {group?.center}</p>
      <p>Number of Group Leaders: {group?.numGroupLeaders}</p>
      <p>Number of Students: {group?.numStudents}</p>
      <p>Arrival Date: {group?.arrivalDate}</p>
      <p>Departure Date: {group?.departureDate}</p>

<Table>
  <TableCaption>Group Leader Information</TableCaption>
  <TableHeader>
    <TableRow>
      <TableHead className="w-[100px]">ID</TableHead>
      <TableHead>First Name</TableHead>
      <TableHead>Last Name</TableHead>
      <TableHead className="text-right">Age</TableHead>
      <TableHead className="text-right">Gender</TableHead>
      <TableHead className="text-right">Center</TableHead>
      <TableHead className="text-right">Group (ID)</TableHead>
      <TableHead className="text-right">Arrival Date</TableHead>
      <TableHead className="text-right">Departure Date</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow>
      {groupLeaders.map((leader) => (
        <TableRow key={leader.id}>
          <TableCell className="w-[100px]">{leader.id}</TableCell>
          <TableCell>{leader.firstName}</TableCell>
          <TableCell>{leader.lastName}</TableCell>
          <TableCell className="text-right">{leader.age}</TableCell>
          <TableCell className="text-right">{leader.gender}</TableCell>
          <TableCell className="text-right">{leader.center}</TableCell>
          <TableCell className="text-right">{group?.name} ({group?.id})</TableCell>
          <TableCell className="text-right">{leader.arrivalDate}</TableCell>
          <TableCell className="text-right">{leader.departureDate}</TableCell>
        </TableRow>
      ))}

    </TableRow>
  </TableBody>
</Table>
      
      <Table>
  <TableCaption>Student Information</TableCaption>
  <TableHeader>
    <TableRow>
      <TableHead className="w-[100px]">ID</TableHead>
      <TableHead>First Name</TableHead>
      <TableHead>Last Name</TableHead>
      <TableHead className="text-center">Age</TableHead>
      <TableHead className="text-center">Gender</TableHead>
      <TableHead className="text-center">Program</TableHead>
      <TableHead className="text-center">Center</TableHead>
      <TableHead className="text-center">Group (ID)</TableHead>
      <TableHead className="text-center">Num. Group Leaders</TableHead>
      <TableHead className="text-center">Arrival Date</TableHead>
      <TableHead className="text-center">Departure Date</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {students.map((student) => (
      <TableRow key={student.id}>
        <TableCell className="w-[100px]">{student.id}</TableCell>
        <TableCell>{student.firstName}</TableCell>
        <TableCell>{student.lastName}</TableCell>
        <TableCell className="text-center">{student.age}</TableCell>
        <TableCell className="text-center">{student.gender}</TableCell>
        <TableCell className="text-center">{student.program}</TableCell>
        <TableCell className="text-center">{group?.center}</TableCell>
        <TableCell className="text-center">{group?.name} ({group?.id})</TableCell>
        <TableCell className="text-center">{group?.numGroupLeaders}</TableCell>
        <TableCell className="text-center">{student.arrivalDate}</TableCell>
        <TableCell className="text-center">{student.departureDate}</TableCell>
      </TableRow>
    ))} 
  </TableBody>
</Table>
    </div>
    
  </>
  );
}

