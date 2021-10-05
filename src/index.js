import Vue from 'vue';
// import {b} from '../b.js';
import {a} from './a.js';
import App from './App.vue';

console.log(a);
new Vue({
  el: '#app',
  components: { App },
});