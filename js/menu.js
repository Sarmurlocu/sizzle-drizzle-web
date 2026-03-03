import { db } from './firebase-config.js'; 
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

async function fetchMenu() {
    const menuContainer = document.getElementById('menu-container');
    if (!menuContainer) return;

    try {
        const menuSnapshot = await getDocs(collection(db, "menu"));
        menuContainer.innerHTML = ""; 

        for (const categoryDoc of menuSnapshot.docs) {
            const categoryData = categoryDoc.data();
            const categoryId = categoryDoc.id;

            const section = document.createElement('section');
            section.innerHTML = `
                <h2 style="margin: 40px 0 20px 0; border-left: 5px solid #d9534f; padding-left: 15px;">
                    ${categoryData.display_name || categoryId}
                </h2>
                <div class="items-grid" id="grid-${categoryId}"></div>
            `;
            menuContainer.appendChild(section);

            const itemsSnapshot = await getDocs(collection(db, `menu/${categoryId}/items`));
            const grid = document.getElementById(`grid-${categoryId}`);

            itemsSnapshot.forEach((itemDoc) => {
                const item = itemDoc.data();
                const itemId = itemDoc.id;
                
                // --- 嚴謹邏輯：處理 Map 結構的標籤 ---
                let tagHtml = "";
                if (item.nutrition_tags && typeof item.nutrition_tags === 'object') {
                    Object.entries(item.nutrition_tags).forEach(([key, value]) => {
                        if (value === true) {
                            tagHtml += `<span class="nutrition-badge">${key}</span>`;
                        }
                    });
                }

                const itemCard = document.createElement('div');
                itemCard.className = 'item-card';
                itemCard.innerHTML = `
                    <h3 style="margin:0;">${item.name}</h3>
                    <div style="margin: 10px 0; min-height: 25px;">${tagHtml}</div>
                    <p class="price-tag">$${(item.base_price || 0).toFixed(2)}</p>
                    <div style="display:flex; gap:10px; align-items:center;">
                        <input type="number" id="qty-${itemId}" value="1" min="1" style="width:45px; padding:8px; border:1px solid #ddd; border-radius:5px;">
                        <button class="add-btn" onclick="window.handleAddToCart('${itemId}', '${item.name.replace(/'/g, "\\'")}', ${item.base_price})">
                            Add to Order
                        </button>
                    </div>
                    <a href="science.html" style="margin-top:15px; font-size:0.8em; color:#007bff; text-decoration:none;">🔬 Nutritional Analysis</a>
                `;
                grid.appendChild(itemCard);
            });
        }
    } catch (error) { console.error("Error loading menu:", error); }
}
fetchMenu();
