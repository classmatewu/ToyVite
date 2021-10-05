<template>
  <div id="wapper">
    hello, {{name}}
  </div>
</template>

<script>
export default {
  name: 'App',
  data() {
    return {
      name: '小吴同学'
    }
  }
}
</script>

<style lang="scss" scope>
#wapper {
  background-color: rgb(62, 202, 137);
  color: #333;
}
</style>
