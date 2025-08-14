document.addEventListener("DOMContentLoaded", function() {
    // رابط Web App الخاص بك
    const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxEH1IQL3sBIRBN-DVbgttvM3Ok8PqAeGxkk6pUz24rm96It-OiKMc2oRvbz41h18kl7Q/exec";

    const form = document.getElementById('visitForm');
    const statusMessage = document.getElementById('statusMessage');
    const customerDetailsDiv = document.getElementById('customerDetails');
    const starRatingContainer = document.querySelector('.star-rating');
    const starRatingInput = document.getElementById('storeRating');
    const customerNameInput = document.getElementById('customerNameInput');
    const customersDatalist = document.getElementById('customersList');
    
    let customersData = []; // لتخزين بيانات العملاء
    let allProductsData = []; // لتخزين بيانات المنتجات

    // جلب البيانات من ملفات JSON
    Promise.all([
        fetch('sales_representatives.json').then(res => res.json()),
        fetch('customers_main.json').then(res => res.json()),
        fetch('actions_list.json').then(res => res.json()),
        fetch('workspace_status.json').then(res => res.json()),
        fetch('products.json').then(res => res.json()),
        fetch('governorates.json').then(res => res.json())
    ]).then(([reps, customers, actions, workspaces, products, governorates]) => {
        customersData = customers;
        allProductsData = products;
        
        populateDropdown('salesRepName', reps);
        populateDropdown('actionsTaken', actions);
        populateDropdown('workspaceStatus', workspaces);
        populateDropdown('governorate', governorates);
        
        const productSelects = document.querySelectorAll('.missingProduct');
        productSelects.forEach(select => populateProductsDropdown(select, allProductsData));

        // في البداية، يتم تعبئة قائمة العملاء بالكامل
        populateCustomersDatalist(customersDatalist, customersData);
    });

    // دالة لملء القوائم المنسدلة البسيطة
    function populateDropdown(selectId, data) {
        const select = document.getElementById(selectId);
        data.forEach(item => {
            const option = document.createElement('option');
            option.value = item;
            option.textContent = item;
            select.appendChild(option);
        });
    }
    
    // دالة لملء قائمة المنتجات
    function populateProductsDropdown(selectElement, productsData) {
        selectElement.innerHTML = '<option value="" disabled selected>اختر منتج</option>';
        productsData.forEach(product => {
            const option = document.createElement('option');
            option.value = product.Product_Name_AR;
            option.setAttribute('data-code', product.Product_Code);
            option.setAttribute('data-category', product.Category);
            option.textContent = product.Product_Name_AR;
            selectElement.appendChild(option);
        });
    }

    // دالة لملء قائمة العملاء الذكية
    function populateCustomersDatalist(listElement, customersList) {
        listElement.innerHTML = '';
        customersList.forEach(customer => {
            const option = document.createElement('option');
            option.value = customer.Customer_Name_AR;
            option.setAttribute('data-code', customer.Customer_Code);
            listElement.appendChild(option);
        });
    }

    // منطق البحث الديناميكي عن العملاء
    customerNameInput.addEventListener('keyup', function() {
        const searchTerm = this.value.trim().toLowerCase();
        
        // إذا كان هناك مدخل، قم بفلترة العملاء
        if (searchTerm.length > 0) {
            const filteredCustomers = customersData.filter(customer => 
                customer.Customer_Name_AR.toLowerCase().includes(searchTerm)
            );
            populateCustomersDatalist(customersDatalist, filteredCustomers);
        } else {
            // إذا كان الحقل فارغًا، أظهر كل العملاء
            populateCustomersDatalist(customersDatalist, customersData);
        }
        
        // تحديث عرض تفاصيل العميل عند الاختيار
        const selectedOption = Array.from(customersDatalist.options).find(option => option.value === this.value);
        if (selectedOption) {
            const customerCode = selectedOption.getAttribute('data-code');
            const customerName = selectedOption.value;
            document.getElementById('customerCodeHidden').value = customerCode;
            customerDetailsDiv.innerHTML = `<strong>العميل:</strong> ${customerName} <br> <strong>الكود:</strong> ${customerCode}`;
            customerDetailsDiv.style.display = 'block';
        } else {
            document.getElementById('customerCodeHidden').value = '';
            customerDetailsDiv.style.display = 'none';
        }
    });

    // تحسين تجربة البحث للعميل
    customerNameInput.addEventListener('focus', function() {
        this.placeholder = "اكتب اسم العميل أو جزء منه...";
    });

    customerNameInput.addEventListener('blur', function() {
        this.placeholder = "ابدأ بكتابة اسم العميل...";
    });
    
    // منطق تقييم النجوم
    starRatingContainer.addEventListener('click', function(e) {
        if (e.target.classList.contains('fa-star')) {
            const rating = e.target.dataset.rating;
            starRatingInput.value = rating;
            
            const stars = starRatingContainer.querySelectorAll('.fa-star');
            stars.forEach(star => {
                if (star.dataset.rating <= rating) {
                    star.classList.remove('far');
                    star.classList.add('fas');
                } else {
                    star.classList.remove('fas');
                    star.classList.add('far');
                }
            });
        }
    });
    
    // إضافة حقل منتج ناقص جديد
    const addProductBtn = document.getElementById('addProductBtn');
    const productsContainer = document.getElementById('missingProductsContainer');
    addProductBtn.addEventListener('click', function() {
        const newProductItem = document.createElement('div');
        newProductItem.classList.add('missing-product-item');
        newProductItem.innerHTML = `
            <select class="missingProduct" name="missingProduct" required></select>
            <input type="hidden" class="missingProductCode" name="missingProductCode">
            <input type="hidden" class="missingProductCategory" name="missingProductCategory">
            <button type="button" class="remove-product-btn">X</button>
        `;
        productsContainer.appendChild(newProductItem);
        const newSelect = newProductItem.querySelector('.missingProduct');
        populateProductsDropdown(newSelect, allProductsData);
    });

    // إزالة حقل منتج ناقص
    productsContainer.addEventListener('click', function(e) {
        if (e.target.classList.contains('remove-product-btn')) {
            if (productsContainer.querySelectorAll('.missing-product-item').length > 1) {
                e.target.closest('.missing-product-item').remove();
            }
        }
    });
    
    // ربط كود المنتج واسمه وفئته بحقل الإدخال المخفي عند التغيير
    productsContainer.addEventListener('change', function(e) {
        if (e.target.classList.contains('missingProduct')) {
            const selectedOption = e.target.options[e.target.selectedIndex];
            const codeInput = e.target.closest('.missing-product-item').querySelector('.missingProductCode');
            const categoryInput = e.target.closest('.missing-product-item').querySelector('.missingProductCategory');
            
            if (codeInput && selectedOption) {
                codeInput.value = selectedOption.getAttribute('data-code');
            }
            if (categoryInput && selectedOption) {
                categoryInput.value = selectedOption.getAttribute('data-category');
            }
        }
    });

    // دالة إرسال النموذج
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        statusMessage.textContent = 'جاري الإرسال...';
        statusMessage.className = 'status loading';
        
        const formData = new FormData(form);
        const missingProducts = [];
        const missingProductCodes = [];
        const missingProductCategories = [];

        const productNames = form.querySelectorAll('select.missingProduct');
        const productCodes = form.querySelectorAll('input.missingProductCode');
        const productCategories = form.querySelectorAll('input.missingProductCategory');

        productNames.forEach((select, index) => {
            const name = select.value;
            const code = productCodes[index] ? productCodes[index].value : '';
            const category = productCategories[index] ? productCategories[index].value : '';
            if (name && code) {
                missingProducts.push(name);
                missingProductCodes.push(code);
                missingProductCategories.push(category);
            }
        });
        
        formData.append('missingProducts', missingProducts.join(','));
        formData.append('missingProductCodes', missingProductCodes.join(','));
        formData.append('missingProductCategories', missingProductCategories.join(','));
        
        formData.delete('missingProduct');
        formData.delete('missingProductCode');
        formData.delete('missingProductCategory');

        fetch(SCRIPT_URL, {
            method: 'POST',
            body: formData
        })
        .then(response => response.text())
        .then(result => {
            if (result.includes('Success')) {
                statusMessage.textContent = 'تم إرسال البيانات بنجاح!';
                statusMessage.className = 'status success';
                form.reset();
            } else {
                throw new Error('فشل الإرسال.');
            }
        })
        .catch(error => {
            statusMessage.textContent = 'حدث خطأ: ' + error.message;
            statusMessage.className = 'status error';
            console.error('Error:', error);
        });
    });
});