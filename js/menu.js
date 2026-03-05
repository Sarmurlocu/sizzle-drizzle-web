import { db } from './firebase-config.js';
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

async function loadMenu() {
    const container = document.getElementById('menu-container');
    if (!container) return;

    console.log("System: Starting to fetch menu data...");

    try {
        // 【明確的範圍】：這裡已經將目標集合精確修改為 "menu"
        const querySnapshot = await getDocs(collection(db, "menu"));
        
        // 邊界檢查：資料庫是否為空
        if (querySnapshot.empty) {
            console.warn("System Warning: 資料庫集合 'menu' 是空的！");
            container.innerHTML = '<p>⚠️ No precision items found in database. Please add items to the "menu" collection.</p>';
            return;
        }

        const items = [];
        querySnapshot.forEach((doc) => {
            items.push({ id: doc.id, ...doc.data() });
        });
        console.log(`System: Successfully loaded ${items.length} items from 'menu'.`);

        // 嚴謹的邏輯：分類過濾
        const categories = {
            "01. Fresh Produce": items.filter(i => i.category === "Fresh Produce"),
            "02. Chef's Special Dishes": items.filter(i => i.category === "Chef's Special Dishes")
        };

        let html = '';

        for (const [categoryName, catItems] of Object.entries(categories)) {
            if (catItems.length === 0) continue;

            html += `<h2 class="menu-section-title">${categoryName}</h2>`;
            html += `<div class="items-grid">`;

            catItems.forEach(item => {
                // 將營養素陣列轉換為標籤
                const nutrientsHtml = (item.nutrients || [])
                    .map(n => `<span class="nutrient-tag">${n}</span>`)
                    .join('');

                const safeId = item.id.replace(/\s+/g, '-');

                // 嚴謹邏輯 (If)：價格顯示判斷
                let priceHtml = '';
                const currentPrice = Number(item.price);
                const originalPrice = Number(item.originalPrice);

                if (originalPrice && originalPrice > currentPrice) {
                    // 有原價且大於現價 -> 顯示紅色現價 + 刪除線原價
                    priceHtml = `
                        <span style="color: var(--harvard-red); font-weight: bold; font-size: 1.2rem;">$${currentPrice.toFixed(2)}</span>
                        <span style="color: #94a3b8; text-decoration: line-through; font-size: 0.9rem;">$${originalPrice.toFixed(2)}</span>
                    `;
                } else {
                    // 一般商品 -> 黑色現價
                    priceHtml = `<span style="color: var(--text-main); font-weight: bold; font-size: 1.2rem;">$${currentPrice.toFixed(2)}</span>`;
                }

                html += `
                    <div class="item-card">
                        <h3>${item.name}</h3>
                        <div class="nutrient-container">${nutrientsHtml}</div>
                        <div class="price-row">
                            <div class="price-display">${priceHtml}</div>
                            <span style="font-size: 0.8rem; color: #888;">Stock: ${item.stock || 0}</span>
                        </div>
                        <div class="add-to-cart-controls">
                            <input type="number" id="qty-${safeId}" value="1" min="1" max="${item.stock || 99}">
                            <button onclick="window.handleAddToCart('${item.id}', '${item.name}', ${currentPrice}, '${safeId}')">Add to Order</button>
                        </div>
                    </div>
                `;
            });

            html += `</div>`; 
        }

        container.innerHTML = html;
        console.log("System: Menu rendering complete.");

    } catch (error) {
        console.error("Critical Error during loadMenu:", error);
        container.innerHTML = `<p style="color:red;">❌ Error loading menu: ${error.message}</p>`;
    }
}

// 執行載入
loadMenu();
