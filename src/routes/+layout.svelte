<script lang="ts">
  import '../app.css';
  import { onMount } from 'svelte';

  let { children } = $props();

  onMount(() => {
    console.log('Veil Browser UI mounted');
  });
</script>

{@render children()}
