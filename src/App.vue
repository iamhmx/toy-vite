<template>
	<p>{{ count }}</p>
	<button @click="add">点我</button>
</template>

<script>
export default {
	name: 'App',
	data() {
		return {
			count: 0,
		}
	},
	methods: {
		add() {
			this.count++
		},
	},
}
</script>
