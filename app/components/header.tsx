import "../custom.css";

export default function Header(){
    return(
        <header className="header">
            <h1 className="eChat">eChat</h1>
            <nav>
                <ul className="flex space-x-4">
                    <li><a href="/" className="hover:underline">Home</a></li>
                    <li><a href="/groups" className="hover:underline">Groups</a></li>
                    <li><a href="/staff" className="hover:underline">Staff</a></li>
                    <li><a href="/activities" className="hover:underline">Activities</a></li>
                </ul>
            </nav>
        </header>
    )
}