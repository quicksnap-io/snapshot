<script setup>
import IncentivesCustomBlock from './components/CustomBlock.vue';

defineProps({
  space: Object,
  proposal: Object,
  results: Object,
  loadedResults: Boolean,
  strategies: Object
});
</script>

<template>
  <IncentivesCustomBlock
    :loaded="loadedResults"
    :space="space"
    :proposal="proposal"
    :results="results"
    :strategies="strategies"
  />
</template>
