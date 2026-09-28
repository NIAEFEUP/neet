<script lang="ts">
// biome-ignore lint/correctness/noUnusedImports: used in markup
import { enhance } from "$app/forms";
</script>

<div class="max-w-2xl mx-auto p-6 bg-white shadow rounded-xl mt-10">
  <h1 class="text-3xl font-bold mb-6 text-green-700">Create an Event</h1>
  <form method="POST" use:enhance class="space-y-4">
    <div>
      <label class="block text-sm font-medium text-gray-700" for="title">Event Title</label>
      <input type="text" name="title" id="title" required class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500" placeholder="e.g. Project Kickoff">
    </div>

    <div>
      <label class="block text-sm font-medium text-gray-700" for="description">Description (optional)</label>
      <textarea name="description" id="description" rows="3" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"></textarea>
    </div>

    <div class="grid grid-cols-2 gap-4">
      <div>
        <label class="block text-sm font-medium text-gray-700" for="startDate">Start Date</label>
        <input type="date" name="startDate" id="startDate" required class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500">
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700" for="endDate">End Date</label>
        <input type="date" name="endDate" id="endDate" required class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500">
      </div>
    </div>

    <div>
      <label class="block text-sm font-medium text-gray-700" for="timezone">Timezone</label>
      <select name="timezone" id="timezone" required class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500">
        <option value="America/New_York">Eastern Time (ET)</option>
        <option value="America/Chicago">Central Time (CT)</option>
        <option value="America/Denver">Mountain Time (MT)</option>
        <option value="America/Los_Angeles">Pacific Time (PT)</option>
        <option value="Europe/London">London (GMT)</option>
        <option value="Europe/Lisbon">Lisbon (WET)</option>
        <option value="Europe/Paris">Paris (CET)</option>
      </select>
    </div>

    <button type="submit" class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500">
      Create Event
    </button>
  </form>
</div>
