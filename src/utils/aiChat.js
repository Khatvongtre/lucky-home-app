export const INITIAL_AI_MESSAGES = [{
    role: "assistant",
    text: "Chào bạn! Tôi là trợ lý AI. Hệ thống đang sẵn sàng. Bạn có thể hỏi tôi để phân tích dữ liệu hoặc chọn thao tác nhanh dưới đây:",
    actions: [
        { code: "FAST_INPUT", label: "Nhập siêu tốc AI" },
        { code: "ADD_TRANSACTION", label: "Ghi sổ thu chi" },
        { code: "VIEW_FUNDS", label: "Xem sổ quỹ" },
        { code: "METER_INPUT", label: "Chốt điện nước" },
        { code: "VIEW_BILLS", label: "Quản lý hóa đơn" },
        { code: "ADD_ROOM", label: "Thêm phòng mới" },
        { code: "ADD_SAVING", label: "Sổ tiết kiệm" },
    ],
}];
