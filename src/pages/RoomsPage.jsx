import { useRooms } from "../hooks/useRooms";

const RoomsPage = () => {
    const { rooms, createRoom } = useRooms();

    return (
        <div>
            <h2>Phòng</h2>

            <button
                onClick={() => createRoom({ name: "Phòng mới", price: 3000000 })}
                className="bg-green-500 text-white px-3 py-1"
            >
                + Thêm
            </button>

            {rooms.map((r) => (
                <div key={r.id} className="border p-2 mt-2">
                    {r.name} - {r.price}
                </div>
            ))}
        </div>
    );
};

export default RoomsPage;