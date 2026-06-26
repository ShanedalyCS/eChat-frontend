import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
    index("routes/home.tsx"),
    route("/groups", "routes/groups.tsx"),
    route("/groups/:groupId", "routes/individualGroup.tsx"),
    route("/staff", "routes/staff.tsx"),
    route("/activities", "routes/activities.tsx"),
    route("/students/:studentId", "routes/individualStudent.tsx"),

] satisfies RouteConfig;
