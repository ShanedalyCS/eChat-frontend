import { useEffect, useState } from "react";
import { useParams } from "react-router";
import Header from "~/components/header";
import { Button } from "~/components/ui/button";
import "../custom.css";
import { Table } from "lucide-react";

type Group = {
  id: number;
  name: string;
  center: string;
  numGroupLeaders: number;
  numStudents: number;
  arrivalDate: string;
  departureDate: string;
};

export default function IndividualGroup() {
  const { groupId } = useParams();
  const [group, setGroup] = useState<Group | null>(null);

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

      <table>
        <tr>
          <th>Group Leader ID</th>
          <th>First Name</th>
          <th>Last Name</th>
          <th>Phone Number</th>
        </tr>
      </table>
      
      <table>
        <tr>
          <th>Student ID</th>
          <th>First Name</th>
          <th>Last Name</th>
          <th></th>
        </tr>
      </table>
    </div>
    
  </>
  );
}

