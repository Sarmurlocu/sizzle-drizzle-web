import { db } from './firebase-config.js';
import { checkHarvardDiscount } from './auth.js'; // 1. 引入折扣偵測邏輯
import { collection, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// 全域變數：存儲當前哈佛社群折扣（預設 1.0 代表不打折）
let currentCommunityDiscount = 1.0;

// --- 核心邏輯：從 Firebase 抓取菜單 ---
async function fetchMenu() {
    try {
        const menuContainer = document.getElementById('menu-container');
        menuContainer.innerHTML = ''; // 清空現有內容，避免重複渲染

        // 明確的範圍：確保 01_fresh_produce 在 02_chinese_dishes 之前
        const menuQuery = query(collection(db, "menu"), orderBy("__name__"));
        const menuSnapshot = await getDocs(menuQuery);

        for (const categoryDoc of menuSnapshot.docs) {
            const categoryData = categoryDoc.data();
            const categoryId = categoryDoc.id;
            
            renderCategory(categoryId, categoryData.display_name);

            // 抓取子集合 items
            const itemsRef = collection(db, `menu/${categoryId}/items`);
            const itemsSnapshot = await getDocs(itemsRef);
            
            itemsSnapshot.forEach((itemDoc) => {
                renderItem(categoryId, itemDoc.id, itemDoc.data());
            });
        }
    } catch (error) {
        console.error("Error fetching menu: ", error);
    }
}

// --- UI 渲染函數 ---
function renderCategory(id, name) {
    const container = document.getElementById('menu-container');
    const section = document.createElement('section');
    section.className = 'menu-section';
    section.innerHTML = `<h2>${name}</h2><div class="items-grid" id="grid-${id}"></div>`;
    container.appendChild(section);
}

function renderItem(categoryId, itemId, item) {
    const grid = document.getElementById(`grid-${categoryId}`);
    const itemEl = document.createElement('div');
    itemEl.className = 'item-card';
    
    // 嚴謹邏輯：計算最終價格
    // 公式：原價 * (後台折扣率，若無則為1) * 哈佛社群折扣
    const adminDiscount = item.is_discounted ? item.discount_rate : 1;
    const finalPrice = (item.base_price * adminDiscount * currentCommunityDiscount).toFixed(2);

    itemEl.innerHTML = `
        <h3>${item.name}</h3>
        <p class="price-tag">Price: $${finalPrice}</p>
        <p class="stock-tag">Stock: ${item.stock}</p>
        <button onclick="addToCart('${itemId}', '${item.name}', ${finalPrice})">Add to Order</button>
    `;
    grid.appendChild(itemEl);
}

// --- 監聽「Apply Discount」按鈕 ---
// 這裡就是你提到的「連動折扣偵測」位置
document.addEventListener('DOMContentLoaded', () => {
    const verifyBtn = document.getElementById('verify-email');
    if (verifyBtn) {
        verifyBtn.addEventListener('click', () => {
            const emailInput = document.getElementById('user-email');
            const email = emailInput.value;

            // 調用 auth.js 的邏輯進行邊界檢查
            const discount = checkHarvardDiscount(email);
            
            if (discount < 1.0) {
                currentCommunityDiscount = discount;
                alert("🎉 Harvard Discount Applied! Prices updated.");
                fetchMenu(); // 重新執行演算法，更新所有價格標籤
            } else {
                currentCommunityDiscount = 1.0;
                alert("Standard pricing applied.");
                fetchMenu();
            }
        });
    }
    
    // 初始載入菜單
    fetchMenu();
});
