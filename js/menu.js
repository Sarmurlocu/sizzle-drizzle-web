import { db } from './firebase-config.js';
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

async function loadMenu() {
    const container = document.getElementById('menu-container');
    if (!container) return;

    console.log("System: Starting to fetch menu data from 'menu' collection...");

    try {
        // 1. 抓取資料
        const querySnapshot = await getDocs(collection(db, "menu"));
        
        if (querySnapshot.empty) {
            console.warn("System Warning: 資料庫集合 'menu' 是空的！");
            container.innerHTML = '<p>⚠️ No items found in the database. Please add items to the "menu" collection.</p>';
            return;
        }

        const items = [];
        querySnapshot.forEach((doc) => {
            items.push({ id: doc.id, ...doc.data() });
        });
        console.log(`System: Successfully loaded ${items.length} items.`, items);

        // 2. 【魯棒性升級：動態分組演算法】
        // 自動讀取 Firebase 的 category 欄位進行分組，容忍所有拼字或大小寫錯誤
        const categories = {};
        items.forEach(item => {
            const cat = item.category || "Uncategorized"; // 防禦：如果沒填分類
            if (!categories[cat]) {
                categories[cat] = [];
            }
            categories[cat].push(item);
        });

        let html = '';

        // 3. 渲染畫面
        for (const [categoryName, catItems] of Object.entries(categories)) {
            html += `<h2 class="menu-section-title">${categoryName}</h2>`;
            html += `<div class="items-grid">`;

            catItems.forEach(item => {
                // 防禦：如果 nutrients 不是陣列，給予空陣列避免報錯
                const nutrientsHtml = (Array.isArray(item.nutrients) ? item.nutrients : [])
                    .map(n => `<span class="nutrient-tag">${n}</span>`)
                    .join('');

                const safeId = item.id.replace(/\s+/g, '-');

                // 價格邏輯
                let priceHtml = '';
                const currentPrice = Number(item.price) || 0;
                const originalPrice = Number(item.originalPrice) || 0;

                if (originalPrice > currentPrice && currentPrice > 0) {
                    priceHtml = `
                        <span style="color: var(--harvard-red); font-weight: bold; font-size: 1.2rem;">$${currentPrice.toFixed(2)}</span>
                        <span style="color: #94a3b8; text-decoration: line-through; font-size: 0.9rem; margin-left: 5px;">$${originalPrice.toFixed(2)}</span>
                    `;
                } else {
                    priceHtml = `<span style="color: var(--text-main); font-weight: bold; font-size: 1.2rem;">$${currentPrice.toFixed(2)}</span>`;
                }

                html += `
                    <div class="item-card">
                        <h3>${item.name || 'Unnamed Item'}</h3>
                        <div class="nutrient-container">${nutrientsHtml}</div>
                        <div class="price-row">
                            <div class="price-display">${priceHtml}</div>
                            <span style="font-size: 0.8rem; color: #888;">Stock: ${item.stock || 0}</span>
                        </div>
                        <div class="add-to-cart-controls">
                            <input type="number" id="qty-${safeId}" value="1" min="1" max="${item.stock || 99}">
                            <button onclick="window.handleAddToCart('${item.id}', '${item.name || 'Item'}', ${currentPrice}, '${safeId}')">Add to Order</button>
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
        container.innerHTML = `<p style="color:red;">❌ Error loading menu: ${error.message}<br>請檢查 Firebase 安全規則是否允許讀取 (allow read: if true;)</p>`;
    }
}

// 執行
loadMenu();
