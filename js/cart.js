import { db } from './firebase-config.js';
import { collection, query, where, getDocs, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- 智能取餐排程演算法 (Smart Pickup Scheduler) ---
async function getNextAvailableSlot() {
    try {
        const now = new Date();
        // 將當前時間轉化為 ID 格式，例如 10:45 轉為 1045
        const currentTimeId = now.getHours() * 100 + now.getMinutes();
        
        const slotsRef = collection(db, "pickup_slots");
        // 嚴謹邏輯：只查詢啟用的時段，並按文檔 ID (時間) 排序
        const q = query(slotsRef, where("is_active", "==", true), orderBy("__name__"));
        const querySnapshot = await getDocs(q);

        let selectedSlot = null;

        for (const doc of querySnapshot.docs) {
            const slotId = parseInt(doc.id);
            const data = doc.data();
            
            // 周全防禦：
            // 1. 該時段 ID 必須大於等於當前時間 (不顯示已過去的時段)
            // 2. 預約人數必須小於最大容量
            if (slotId >= currentTimeId && data.current_booked < data.max_capacity) {
                selectedSlot = {
                    id: doc.id,
                    display: data.time_label // 直接抓取後台截圖中的 "11:30~11:45"
                };
                break;
            }
        }

        // 魯棒性：如果所有時段都滿了或找不到符合條件的區間
        return selectedSlot || { id: "0", display: "All slots full - Please try tomorrow" };
        
    } catch (error) {
        console.error("Scheduling Algorithm Error:", error);
        return { id: "0", display: "System Busy - TBD" };
    }
}

// --- 渲染訂單摘要 (美語環境對齊) ---
async function renderSummary() {
    const summarySection = document.getElementById('group-order-summary');
    const summaryText = document.getElementById('summary-text');
    
    if (cart.length === 0) {
        summarySection.style.display = 'none';
        return;
    }

    summarySection.style.display = 'block';
    
    // 非同步獲取最優取餐時間
    const slot = await getNextAvailableSlot();
    
    let subtotal = 0;
    let itemsLines = `🛒 Sizzle & Drizzle | Your Order Summary\n`;
    itemsLines += `==================================\n`;

    cart.forEach(item => {
        const lineTotal = item.unitPrice * item.quantity;
        subtotal += lineTotal;
        itemsLines += `• ${item.name} x${item.quantity}  >>  $${lineTotal.toFixed(2)}\n`;
    });

    const harvardTotal = subtotal * 0.9;

    itemsLines += `==================================\n`;
    itemsLines += `ESTIMATED PICKUP WINDOW:\n`;
    itemsLines += `👉 ${slot.display}\n`; // 這裡會精確顯示後台設定的標籤
    itemsLines += `==================================\n`;
    itemsLines += `SUBTOTAL: $${subtotal.toFixed(2)}\n`;
    itemsLines += `CAMPUS PRICE (10% OFF): $${harvardTotal.toFixed(2)}\n`;
    itemsLines += `==================================\n`;
    itemsLines += `NOTE: Show Harvard ID at pickup.\n`;
    itemsLines += `Order Sync: Academic Precision 🔬`;

    summaryText.innerText = itemsLines;
}

// 保持複製功能
window.copySummary = () => {
    const text = document.getElementById('summary-text').innerText;
    navigator.clipboard.writeText(text).then(() => {
        alert("✅ Order copied to clipboard!\nSend this to us via your preferred messenger.");
    });
};
