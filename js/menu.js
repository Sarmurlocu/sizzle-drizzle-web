import { db } from './firebase-config.js'; 
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

async function fetchMenu() {
    const menuContainer = document.getElementById('menu-container');
    const menuSnapshot = await getDocs(collection(db, "menu"));

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
            itemCard.innerHTML = `
                <h3>${item.name || 'Unnamed Item'}</h3>
                <p class="price-tag">$${basePrice.toFixed(2)}</p>
                <p class="stock-tag">Stock: ${item.stock || 0}</p>
                <div style="margin: 15px 0;">
                    <label style="font-weight:bold;">Quantity: </label>
                    <input type="number" id="qty-${itemId}" value="1" min="1" max="${item.stock || 99}" 
                           style="width: 60px; padding: 5px; border-radius: 5px; border: 1px solid #ccc;">
                </div>
                <button onclick="window.handleAddToCart('${itemId}', '${item.name}', ${basePrice})">Add to Order</button>
            `;
            grid.appendChild(itemCard);
        });
    }
}

fetchMenu();
