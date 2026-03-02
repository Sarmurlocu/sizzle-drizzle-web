import { db } from './firebase-config.js'; 
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

async function fetchMenu() {
    const menuContainer = document.getElementById('menu-container');
    if (!menuContainer) return;

    try {
        console.log("✅ Firebase 連線成功，開始抓取菜單...");
        const menuSnapshot = await getDocs(collection(db, "menu"));

        // 遞迴渲染分類與菜色
        for (const categoryDoc of menuSnapshot.docs) {
            const categoryData = categoryDoc.data();
            const categoryId = categoryDoc.id;

            const section = document.createElement('section');
            section.className = 'menu-category';
            section.innerHTML = `
                <h2>${categoryData.display_name || categoryId}</h2>
                <div class="items-grid" id="grid-${categoryId}"></div>
            `;
            menuContainer.appendChild(section);

            const itemsSnapshot = await getDocs(collection(db, `menu/${categoryId}/items`));
            const grid = document.getElementById(`grid-${categoryId}`);

            itemsSnapshot.forEach((itemDoc) => {
                const item = itemDoc.data();
                const itemId = itemDoc.id;
                const basePrice = item.base_price || 0;
                
                const itemCard = document.createElement('div');
                itemCard.className = 'item-card';
                
                // 嚴謹邏輯：在 JS 字串中使用 \' 來確保生成的 HTML 屬性包含引號
                // 例如：window.handleAddToCart('napa_cabbage', 'Napa Cabbage', 2.25)
                itemCard.innerHTML = `
                    <h3>${item.name || 'Unnamed'}</h3>
                    <p class="price-tag">$${basePrice.toFixed(2)}</p>
                    <div style="margin: 15px 0;">
                        <label>Qty: </label>
                        <input type="number" id="qty-${itemId}" value="1" min="1" style="width: 50px; padding: 5px; border-radius: 4px; border: 1px solid #ccc;">
                    </div>
                    <button onclick="window.handleAddToCart('${itemId}', '${item.name.replace(/'/g, "\\'")}', ${basePrice})">Add to Order</button>
                `;
                grid.appendChild(itemCard);
            });
        }
    } catch (error) {
        console.error("Database Error:", error);
        menuContainer.innerHTML = `<p style="color:red;">Error loading menu: ${error.message}</p>`;
    }
}

fetchMenu();
