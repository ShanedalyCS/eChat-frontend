import {useEffect, useState} from "react";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import Header from "~/components/header";

type StaffMember = {
    id: number;
    firstName: string;
    lastName: string;
    center: string;
};



export default function staff(){

    const [staffTable, setStaff] = useState<StaffMember[]>([]);

    useEffect(() => {
        async function fetchStaff() {
            try {
                const response = await fetch("http://localhost:8080/staff");
                const data = await response.json();
                setStaff(data);
            } catch (error) {
                console.error("Failed to fetch staff:", error);
            }
        }
        fetchStaff();
    }, []);
 
    return(
       <> 
       <Header/>
       <h1>Staff</h1>
        <Table>
            <TableCaption>A list of your staff.</TableCaption>
            <TableHeader>
                <TableRow>
                    <TableHead className="w-[100px]">Staff ID</TableHead>
                    <TableHead>First Name</TableHead>
                    <TableHead>Last Name</TableHead>
                    <TableHead>Center</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {staffTable.map((staff) => (
                    <TableRow key={staff.id}>
                        <TableCell className="font-medium">{staff.id}</TableCell>
                        <TableCell>{staff.firstName}</TableCell>
                        <TableCell>{staff.lastName}</TableCell>
                        <TableCell>{staff.center}</TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
        </>
    );
}
