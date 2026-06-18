import Header from "~/components/header";
import { Button } from "../components/ui/button";

import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";

import { useEffect, useState } from "react";

type Group = {
  id: number;
  name: string;
  center: string;
  numGroupLeaders: number;
  numStudents: number;
  arrivalDate: string;
  departureDate: string;
};

export default function Groups() {
  const [groupTable, setGroups] = useState<Group[]>([]);

  useEffect(() => {
    async function fetchGroups() {
      try {
        const response = await fetch("http://localhost:8080/groups");
        const data = await response.json();

        setGroups(data);
      } catch (error) {
        console.error("Failed to fetch groups:", error);
      }
    }

    fetchGroups();
  }, []);

  return (
    <>
      <Header />
      <h1>Groups</h1>


      <Table>
        <TableCaption>A list of your groups.</TableCaption>

        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">Group ID</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Center</TableHead>
            <TableHead>Num. GL</TableHead>
            <TableHead>Num. Students</TableHead>
            <TableHead>Arrival Date</TableHead>
            <TableHead>Departure Date</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {groupTable.map((group) => (
            <TableRow key={group.id}>
              <TableCell className="font-medium">{group.id}</TableCell>
              <TableCell className="hover:text-green-500 hover:underline">{<a href={`/groups/${group.id}`}>{group.name}</a>}</TableCell>
              <TableCell>{group.center}</TableCell>
              <TableCell>{group.numGroupLeaders}</TableCell>
              <TableCell>{group.numStudents}</TableCell>
              <TableCell>{group.arrivalDate}</TableCell>
              <TableCell>{group.departureDate}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  );
}
