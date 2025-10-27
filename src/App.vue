<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'

const test = 1

const products = [
  {id: 1, name: 'Shoes', price: 399, desc: 'A nice shoes'},
  {id: 2, name: 'T-shirt', price: 79, desc: 'A nice T-shirt'},
  {id: 3, name: 'Bag', price: 299, desc: 'A nice bag'},
  {id: 4, name: 'bottle of water', price: 399, desc: 'Just a bottle of water'},
  //cheange it
  {id: 5, name: 'bottle of water', price: 399, desc: 'Just a bottle of water'},
  {id: 6, name: 'bottle of water', price: 399, desc: 'Just a bottle of water'},
  {id: 7, name: 'bottle of water', price: 399, desc: 'Just a bottle of water'},
  {id: 8, name: 'bottle of water', price: 399, desc: 'Just a bottle of water'},
  {id: 9, name: 'bottle of water', price: 399, desc: 'Just a bottle of water'},
  {id: 10, name: 'bottle of water', price: 399, desc: 'Just a bottle of water'},
  {id: 11, name: 'bottle of water', price: 399, desc: 'Just a bottle of water'},
  {id: 12, name: 'bottle of water', price: 399, desc: 'Just a bottle of water'},
]
  const cart = ref([])
  const cartCount = computed(() => cart.value.reduce((s, i) => s + i.qty, 0))
  const cartTotal = computed(() => cart.value.reduce((s, i) => s + i.qty * i.price, 0))

  function addToCart(singleProduct) {
    const item = cart.value.find(i => i.id === singleProduct.id)
    if(item) {
      item.qty += 1
      notify(`${singleProduct.name}: quantity +1`)
    } else {
      cart.value.push({
        id: singleProduct.id,
        name: singleProduct.name,
        price: singleProduct.price,
        qty: 1
      })
      notify(`${singleProduct.name} 'Added to Cart Successfully!'`)
    }

    console.log(cart.value)
  }

  const showDialog = ref(false)
  const dialogText = ref('')
  
  function notify(text) {
    dialogText.value = text
    showDialog.value = true
  }

  function closeDialog() {
    showDialog.value = false
    // 考虑清除文本
  }

// Quantity change and delete
  function inc(item) { item.qty += 1 }
  function dec(item) { item.qty > 1 ? item.qty -= 1 : remove(item)}
  function remove(item) { cart.value = cart.value.filter(i => i.id !== item.id) }
  function clearCart() { cart.value = [] }

  function getRoute() {
    const h = (location.hash || '').toLowerCase()
    return h.startsWith('#/cart') ? 'cart' : 'products'
  }
  const route = ref(getRoute())
  function goTo(r) {
    route.value = r
    location.hash = '#/' + r
  }
  function onHashChange() {route.value = getRoute()}
  onMounted(() => window.addEventListener('hashchange', onHashChange))
  onUnmounted(() => window.removeEventListener('hashchange', onHashChange))

</script>

<template>
  <main class="container">

    <header class="header">
      <h1 class="brand">Shopping Cart</h1>
      <nav class="nav">
        <a href="#/products" :class="['nav-link', {active: route==='products'}]"
        @click.prevent="goTo('products')">Products</a>
        <a href="#/cart" :class="['nav-link', {active: route==='cart'}]"
        @click.prevent="goTo('cart')">Cart <span class="badge">{{ cartCount }}</span></a>
      </nav>
    </header>
    <div class="page">
      <section v-if="route === 'products'">
        <h2 class="title">Product List</h2>

        <div id="product-list" class="grid">
          <div class="card" v-for="singleProduct in products" :key="singleProduct.id">
            <div class="card-body">
            <h2 class="name">{{ singleProduct.name }}</h2>
            <p class="desc">{{ singleProduct.desc }}</p>
            <p class="price">{{ singleProduct.price }}</p>
            <button @click="addToCart(singleProduct)" class="addToCart-btn" type="button" title="Click to add to cart">Add to Cart</button>
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
              <span class="cart-name">{{ item.name }}</span>
              <div class="qty-controls">
                <button class="qty-btn" @click="dec(item)" aria-label="Decrease">-</button>
                <span class="qty">{{ item.qty }}</span>
                <button class="qty-btn" @click="inc(item)" aria-label="Increase">+</button>
              </div>
              <span class="cart-lineprice">{{ (item.qty * item.price).toFixed(2) }}</span>
              <button class="remove-btn" @click="remove(item)" aria-label="Remove">x</button>
            </li>
          </ul>
          <div class="summary">
            <div>Items: <strong>{{ cartCount }}</strong></div>
            <div>Total: <strong>{{ cartTotal.toFixed(2) }}</strong></div>
          </div>
          <div class="cart-acitions">
            <a href="#/products" class="link" @click.prevent="goTo('products')"><-Continue shopping</a>
            <button class="clear-btn" @click="clearCart">Clear Cart</button>
          </div>
        </div>
      </section>

    

    </div>

    <transition name = "fade">
      <div class="modal-backdrop" v-if="showDialog" @click.self="closeDialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title">
        <div class="modal">
          <h3 id="dialog-title" class="modal-title">Notify</h3>
          <p class="modal-text">{{ dialogText }}</p>
          <div class="modal-actions">
            <button type="button" class="ok-btn" @click="closeDialog">Confirm</button>
          </div>
        </div>
      </div>
    </transition>

  </main>
</template>
