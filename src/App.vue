<script setup>
  import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
  import { fetchLessons, postOrder, putLesson, searchLessons } from './api.js'

  const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000';
  const lessonImageUrl = `${API_BASE}/images/lessons/lesson2.jpg`;

  const products = ref([])
  const loading = ref(true)
  const loadError = ref('')

  function normalizeLesson(d) {
  return {
    id: typeof d._id === 'object' ? (d._id?.$oid ?? '') : (d._id ?? d.id ?? ''),
    topic: d.topic,
    location: d.location,
    price: Number(d.price),
    space: Number(d.space),
    desc: d.desc ?? ''
  }
}

  const imageBase = import.meta.env.VITE_API_BASE || 'http://localhost:3000';

  function lessonImage(_prod) {
    // 简单版本：所有课程用同一张 lesson2.jpg
    return `${imageBase}/images/lessons/lesson2.jpg`;
  }

  //  =======Cart=======
  const cart = ref([])
  const cartCount = computed(() => cart.value.reduce((s, i) => s + i.qty, 0))
  const cartTotal = computed(() => cart.value.reduce((s, i) => s + i.qty * i.price, 0))

  function addToCart(product) {
    if (Number(product.space) <= 0) {
      notify(`${product.topic}: no more space available`)
      return
    }
    product.space = Number(product.space) - 1

    const item = cart.value.find(i => i.id === (product.id || product._id))
    if (item) {
      item.qty += 1
      notify(`${product.topic}: quantity +1`)
    } else {
      cart.value.push({
        id: product.id || product._id, // 兼容字符串 id 或 _id
        topic: product.topic,
        price: Number(product.price),
        qty: 1
      })
      notify(`${product.topic} Added to Cart Successfully!`)
    }
  }

  // ==== Notify ====
  const showDialog = ref(false)
  const dialogText = ref('')
  function notify(text) { dialogText.value = text; showDialog.value = true }
  function closeDialog() { showDialog.value = false }

  // ====Sort Bar====
  const sortKey = ref('topic')
  const sortOrder = ref('asc')
  const sortedProducts = computed(() => {
    const keyMap = { subject:'topic', topic:'topic', location:'location', price:'price', space:'space' }
    const key = keyMap[sortKey.value] || 'topic'
    const dir = sortOrder.value === 'asc' ? 1 : -1
    return [...products.value].sort((a, b) => {
      const va = a[key], vb = b[key]
      if (key === 'topic' || key === 'location') {
        return String(va ?? '').localeCompare(String(vb ?? '')) * dir
      }
      return (Number(va) - Number(vb)) * dir
    })
  })

  // ====Inc and Dec====
  function inc(item) {
    const prod = products.value.find(p => (p.id || p._id) === item.id)
    if (prod && Number(prod.space) > 0) {
      item.qty += 1
      prod.space = Number(prod.space) - 1
    } else {
      notify(`${item.topic}: no more space to increase`)
    }
  }
  function dec(item) {
    const prod = products.value.find(p => (p.id || p._id) === item.id)
    if (item.qty > 1) {
      item.qty -= 1
      if (prod) prod.space = Number(prod.space) + 1
    } else {
      remove(item)
    }
  }
  function remove(item) {
    const prod = products.value.find(p => (p.id || p._id) === item.id)
    if (prod) prod.space = Number(prod.space) + item.qty
    cart.value = cart.value.filter(i => i.id !== item.id)
  }
  function cartSpaceLeft(item) {
    const prod = products.value.find(p => (p.id || p._id) === item.id)
    return prod ? Number(prod.space) : 0
  }
  function clearCart() {
    for (const item of cart.value) {
      const prod = products.value.find(p => (p.id || p._id) === item.id)
      if (prod) prod.space = Number(prod.space) + item.qty
    }
    cart.value = []
  }

  // ====Route====
  function getRoute() {
    const h = (location.hash || '').toLowerCase()
    return h.startsWith('#/cart') ? 'cart' : 'products'
  }
  const route = ref(getRoute())
  function goTo(r) {
    route.value = r
    location.hash = '#/' + r
  }
  function onHashChange() { route.value = getRoute() }

  // —— 页面挂载：注册监听 + 拉取课程 ——
  // 注意：这里只调用了“导入的” api.js 里的 fetchLessons（起别名 apiFetchLessons）
  onMounted(async () => {
    if (searchTimer) clearTimeout(searchTimer)
    loading.value = true
    loadError.value = ''
    try {
      const data = await fetchLessons()
      products.value = (Array.isArray(data) ? data : []).map(d => ({
        id: typeof d._id === 'object' ? (d._id?.$oid ?? '') : (d._id ?? d.id ?? ''),
        topic: d.topic,
        location: d.location,
        price: Number(d.price),
        space: Number(d.space),
        desc: d.desc ?? '',
        image: d.image ?? 'default.png'
      }))
    } catch (err) {
      loadError.value = String(err)
    } finally {
      loading.value = false
    }
  })
  onUnmounted(() => window.removeEventListener('hashchange', onHashChange))

  // —— 结账表单校验（原样保留） ——
  const nameInput = ref('')
  const phoneInput = ref('')
  const nameRegex = /^[A-Za-z]+(?:\s[A-Za-z]+)*$/
  const phoneRegex = /^\d+$/
  const isNameValid = computed(() => nameRegex.test(nameInput.value.trim()))
  const isPhoneValid = computed(() => phoneRegex.test(phoneInput.value.trim()))
  const canCheckout = computed(() => isNameValid.value && isPhoneValid.value)
  const nameTouched = ref(false)
  const phoneTouched = ref(false)

  async function checkout() {
  if (!canCheckout.value) return

  try {
    // 1) 组装订单体，按照后端 server.js 支持的 "items" 形态发送
    const items = cart.value.map(i => ({
      lessonId: i.id, // 这里用上面映射过的 id
      qty: Number(i.qty),
    }))

    const saved = await postOrder({
      name: nameInput.value,
      phone: phoneInput.value,
      items
    })

    await Promise.all(
      cart.value.map(i => {
        const prod = products.value.find(p => (p.id ?? p._id) === i.id)
        if (!prod) return Promise.resolve()
        return putLesson(i.id, { space: Number(prod.space) })
      })
    )

    // fresh the lessons again
    const fresh = await fetchLessons()
    products.value = (Array.isArray(fresh) ? fresh : []).map(d => ({
      id: typeof d._id === 'object' ? (d._id?.$oid ?? '') : (d._id ?? d.id ?? ''),
      topic: d.topic,
      location: d.location,
      price: Number(d.price),
      space: Number(d.space),
      desc: d.desc ?? ''
    }))

    notify(`Order submitted! #${saved.insertedId || ''}`)
    cart.value = []
    nameInput.value = ''
    phoneInput.value = ''
  } catch (e) {
    notify(`Order failed: ${e}`)
  }
}

const searchText   = ref('')
const isSearching  = ref(false)
const searchError  = ref('')
let   searchTimer  = null

async function doSearch(q) {
  const query = (q ?? '').trim()
  isSearching.value = true
  searchError.value = ''
  try {
    if (query === '') {
      // empty -> return all lessons
      const all = await fetchLessons()
      products.value = (Array.isArray(all) ? all : []).map(normalizeLesson)
    } else {
      // key words -> use back-end to search
      const hits = await searchLessons(query)
      products.value = (Array.isArray(hits) ? hits : []).map(normalizeLesson)
    }
  } catch (e) {
    searchError.value = String(e)
  } finally {
    isSearching.value = false
  }
}

// time listener
watch(searchText, (q) => {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => { doSearch(q) }, 300)
})

</script>

<template>
  <main class="container">

    <header class="header">
      <h1 class="brand">Lessons Shopping</h1>
      <nav class="nav">
        <a href="#/products" :class="['nav-link', {active: route==='products'}]"
        v-on:click.prevent="goTo('products')">Products</a>
        <a href="#/cart" :class="['nav-link', {active: route==='cart'}]"
        v-on:click.prevent="goTo('cart')">Cart <span class="badge">{{ cartCount }}</span></a>
      </nav>
      <div class="toolbar">
            <label class="toolbar-label">
              Sort by
              <select v-model="sortKey" class="select">
                <option value="topic">Subject</option>
                <option value="location">Location</option>
                <option value="price">Price</option>
                <option value="space">Space</option>
              </select>
            </label>

            <label class="toolbar-label">
              Order
              <select v-model="sortOrder" class="select">
                <option value="asc">Ascending</option>
                <option value="desc">Descending</option>
              </select>
            </label>
          </div>
      <label class="toolbar-label" style="min-width: 220px;">
    Search
    <input
      v-model="searchText"
      type="text"
      class="select"
      placeholder="Type to search topic/location/price/space" />
  </label>
  <small v-if="isSearching" class="muted">Searching…</small>
  <small v-else-if="searchText && !sortedProducts.length" class="muted">No results</small>
  <small v-else-if="searchError" class="muted">Search error: {{ searchError }}</small>
    </header>
    <div class="page">
      <section v-if="route === 'products'">
        <h2 class="title">Product List</h2>
        <p v-if="loading">Loading lessons…</p>
        <p v-else-if="loadError" class="muted">Load error: {{ loadError }}</p>

        <div v-else id="product-list" class="grid">
          
          <div class="card" v-for="(singleProduct, indedx) in sortedProducts" :key="singleProduct._id || singleProduct.id">
            <div class="card-body">
            <div class="topic-row">
    <h2 class="topic">{{ singleProduct.topic }}</h2>
    <img
      v-if="singleProduct.image"
      class="lesson-icon"
      :src="`http://localhost:3000/images/lessons/${singleProduct.image}`"
      :alt="singleProduct.topic"
    >
  </div>
            <p class="desc">{{ singleProduct.desc }}</p>
            <p class="price">Price: £{{ singleProduct.price }}</p>
            <p class="location">Location: {{ singleProduct.location }}</p>
            <p class="space">Space: {{ singleProduct.space }}</p>
            <button v-on:click="addToCart(singleProduct)" :disabled="Number(singleProduct.space) <= 0" class="addToCart-btn" type="button" title="Click to add to cart">Add to Cart</button>
            </div>
          </div>
        </div>
      </section>
      <section v-else>
        <h2 class="title">Your Cart</h2>

        <p v-if="cart.length === 0" class="muted">Cart is empty.</p>

        <div class="cart" v-else>
          <ul class="cart-list">
            <li class="cart-row" v-for="item in cart" :key="item.id">
              <span class="cart-topic">{{ item.topic }}</span>
              <div class="qty-controls">
                <button class="qty-btn" :disabled="item.qty <= 1" v-on:click="dec(item)" aria-label="Decrease">-</button>
                <span class="qty">{{ item.qty }}</span>
                <button class="qty-btn" :disabled="cartSpaceLeft(item) <= 0" v-on:click="inc(item)" aria-label="Increase">+</button>
              </div>
              <span class="cart-lineprice">{{ (item.qty * item.price).toFixed(2) }}</span>
              <button class="remove-btn" v-on:click="remove(item)" aria-label="Remove">X</button>
            </li>
          </ul>
          <div class="summary">
            <div>Items: <strong>{{ cartCount }}</strong></div>
            <div>Total: <strong>{{ cartTotal.toFixed(2) }}</strong></div>
          </div>
          <div class="cart-actions">
            <a href="#/products" class="link" v-on:click.prevent="goTo('products')"><-Continue shopping</a>
            <button class="clear-btn" v-on:click="clearCart">Clear Cart</button>
          </div>
        </div>

        <div class="checkout">
          <h3 class="checkout-title">Checkout</h3>

          <div class="form-row">
            <label for="name">Name</label>
            <input id="name" type="text" v-model.trim ="nameInput" @blur="nameTouched = true" inputmode="text" placeholder="Letters only" :class="{ invalid: nameTouched && !isNameValid }">
            <small v-if="nameTouched && !isNameValid" class="error">Letters only(A-Z, a-z; spaces allowed).</small>
          </div>

          <div class="form-row">
            <label for="phone">Phone</label>
            <input id="phone" type="text" v-model.trim ="phoneInput" @blur="phoneTouched = true" inputmode="numeric" placeholder="Numbers only" :class="{ invalid: phoneTouched && !isPhoneValid }">
            <small v-if="phoneTouched && !isPhoneValid" class="error">Numbers only (0-9).</small>
          </div>

          <button class="checkout-btn" type="button" :disabled="!canCheckout" v-on:click="checkout" title="Submit order">Checkout here</button>
        </div>
      </section>

    

    </div>

    <transition name = "fade">
      <div class="modal-backdrop" v-if="showDialog" v-on:click.self="closeDialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title">
        <div class="modal">
          <h3 id="dialog-title" class="modal-title">Notify</h3>
          <p class="modal-text">{{ dialogText }}</p>
          <div class="modal-actions">
            <button type="button" class="ok-btn" v-on:click="closeDialog">Confirm</button>
          </div>
        </div>
      </div>
    </transition>

  </main>
</template>

<!-- APP.VUE 作为一个主界面, 然后建立两个vue分别作为lessonList还有shoppingCart -->
<!-- 要加上剩余space, 更改为课程,然后加location,美化,space完了add to cart不可见 -->
<!-- 后端是通过Express作用在render.com上面的, 具体查看老师发来的图片 -->

<!-- 考虑添加排序price<100这种的filter -->


<!-- 在里面考虑增加lessonID去识别 -->
 <!--  -->