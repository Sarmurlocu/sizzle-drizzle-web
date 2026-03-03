import { db } from './firebase-config.js';
import { 
    collection, getDocs, query, orderBy 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// 抽象化：將營養標籤字串轉化為標籤
function formatNutrients(nutrientString) {
    if (!nutrientString) return "";
    return nutrientString.split(/(?=[A-Z])/).map(tag => 
        `<span class="nutrient-tag">${tag.trim()}</span>`
    ).join('');
}

// 嚴謹邏輯：安全地格式化價格，防止 undefined 導致 toFixed 報錯
function safePrice(price) {
    const num = parseFloat(price);
    return isNaN(num) ? "0.00" : num.toFixed(2);
}

async function fetchMenu() {
    const menuContainer = document.getElementById('menu-container');
    if (!menuContainer) return;

    try {
        const categoriesSnapshot = await getDocs(collection(db, "menu"));
        
        if (categoriesSnapshot.empty) {
            menuContainer.innerHTML = "<p>No categories found.</p>";
            return;
        }

        menuContainer.innerHTML = ''; 

        for (const catDoc of categoriesSnapshot.docs) {
            const catData = catDoc.data();
            const catDisplayName = catData.display_name || catDoc.id;
            
            // 指向：menu -> {類別} -> items
            const itemsRef = collection(db, "menu", catDoc.id, "items");
            const itemsSnapshot = await getDocs(itemsRef);

            if (!itemsSnapshot.empty) {
                const section = document.createElement('section');
                section.style.marginBottom = "40px";
                section.innerHTML = `<h2 class="menu-section-title">${catDisplayName}</h2>`;
                
                const grid = document.createElement('div');
                grid.className = 'items-grid';

                itemsSnapshot.forEach(itemDoc => {
                    const item = itemDoc.data();
                    
                    // --- 周全的防禦：確保價格存在且為數字 ---
                    const basePrice = item.price || 0;
                    const discPrice = item.discount_price || 0;
                    const isDiscounted = item.is_discounted === true;
                    const finalPrice = isDiscounted ? discPrice : basePrice;

                    const nutrientHTML = formatNutrients(item.nutrients);

                    grid.innerHTML += `
                        <div class="item-card">
                            <h3 style="margin-top:0;">${item.name || 'Unnamed Item'}</h3>
                            <div class="nutrient-container">${nutrientHTML}</div>
                            <div class="price-row" style="margin: 10px 0; font-weight: 800; font-size: 1.1rem;">
                                ${isDiscounted ? 
                                    `<span style="color:#e63946;">$${safePrice(discPrice)}</span> 
                                     <span style="text-decoration:line-through; color:#999; font-size:0.8rem; margin-left:5px;">$${safePrice(basePrice)}</span>` : 
                                    `<span>$${safePrice(basePrice)}</span>`
                                }
                            </div>
                            <p style="font-size: 0.7rem; color: #888; margin-bottom:15px;">Stock: ${item.stock || 0}</p>
                            
                            <div style="display: flex; gap: 8px; margin-top: auto;">
                                <input type="number" id="qty-${itemDoc.id}" value="1" min="1" max="${item.stock || 99}" 
                                    style="width: 50px; padding: 8px; border: 1px solid #ddd; border-radius: 4px; text-align: center;">
                                <button class="add-btn" 
                                    onclick="window.handleAddToCart('${itemDoc.id}', '${item.name}', ${finalPrice})"
                                    style="flex-grow: 1; padding: 10px; background: #333E48; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold;">
                                    Add to Order
                                </button>
                            </div>
                        </div>
                    `;
                });
                
                section.appendChild(grid);
                menuContainer.appendChild(section);
            }
        }
    } catch (error) {
        console.error("Firebase Sync Error:", error);
        menuContainer.innerHTML = `<div style="color:red;">Sync Error: ${error.message}</div>`;
    }
}

fetchMenu();
