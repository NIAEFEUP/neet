<script lang="ts">
  import { page } from '$app/stores';
</script>

<div class="max-w-2xl mx-auto p-6 bg-white shadow rounded-xl mt-10 text-center">
  <h1 class="text-3xl font-bold mb-4 text-green-700">Event Created!</h1>
  <p class="text-gray-600 mb-6">Your event has been successfully created. You can share this URL with your guests.</p>
  
  <div class="bg-gray-100 p-4 rounded-md font-mono text-sm break-all">
    {$page.url.href}
  </div>

  <div class="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-md text-left">
    <p class="text-yellow-800 text-sm font-medium">Coming next in Issue #6:</p>
    <p class="text-yellow-700 text-xs mt-1">The interactive grid will appear here for guests to submit their availability.</p>
  </div>
</div>
