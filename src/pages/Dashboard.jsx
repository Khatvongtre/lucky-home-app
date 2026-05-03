import { useState } from "react";
import RoomsPage from "./RoomsPage";
import BillsPage from "./BillsPage";
import FinancePage from "./FinancePage";
import { useAuth } from "../hooks/useAuth";

const Dashboard = () => {
    const [tab, setTab] = useState("rooms");
    const { logout } = useAuth();

    return (
        <div className="h-screen flex flex-col">
            <div className="flex justify-between p-4 bg-black text-white">
                <span>SmartStay</span>
                <button onClick={logout}>Logout</button>
            </div>

            <div className="flex-1 p-4">
                {tab === "rooms" && <RoomsPage />}
                {tab === "bills" && <BillsPage />}
                {tab === "finance" && <FinancePage />}
            </div>

            <div className="flex border-t">
                <button onClick={() => setTab("rooms")} className="flex-1 p-3">Phòng</button>
                <button onClick={() => setTab("bills")} className="flex-1 p-3">Hóa đơn</button>
                <button onClick={() => setTab("finance")} className="flex-1 p-3">Tài chính</button>
            </div>
        </div>
    );
};

export default Dashboard;