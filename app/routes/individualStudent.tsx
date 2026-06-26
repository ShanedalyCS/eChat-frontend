import { useParams } from "react-router";
import { Button } from "~/components/ui/button";

import { useEffect, useState } from "react";


export default function IndividualStudent() {


const { studentId }= useParams();
const [student, setStudent] = useState(null);

useEffect(() => {
  if (!studentId) return;

  fetch(`http://localhost:8080/student/${studentId}`)
    .then((response) => response.json())
    .then((data) => {
      console.log(data);
      setStudent(data);
    });
}, [studentId]);    



    return (
    <>
        <Button onClick={() => window.history.back()}>Back</Button>      
      <h1>{student?.firstName} {student?.lastName} ({student?.id})</h1>
      <p>This is the individual student page.</p>
      <Button>Call</Button>
      <Button>Message</Button>
      <p>Center: {student?.center}</p>
        <p>Program: {student?.program}</p>
        <p>Arrival Date: {student?.arrivalDate}</p>
        <p>Departure Date: {student?.departureDate}</p>
        <p>Group: {student?.group?.name} ({student?.group?.id})</p>
        <p>Number of Group Leaders: {student?.group?.numGroupLeaders}</p>
        <p>Group Leaders : {student?.groupLeaders?.map((leader) => `${leader.firstName} ${leader.lastName}`).join(", ")}</p>

        <h1>Schedule</h1>

    </>
  );
}   