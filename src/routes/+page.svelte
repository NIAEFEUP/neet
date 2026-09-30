<script lang="ts">
import type { SubmitFunction } from "@sveltejs/kit";
// biome-ignore lint/correctness/noUnusedImports: used in markup
import { enhance } from "$app/forms";
import type { ActionData } from "./$types";

// biome-ignore lint/correctness/noUnusedVariables: used in markup
let { form } = $props<{ form: ActionData }>();

// biome-ignore lint/correctness/noUnusedVariables: used in markup
const timezones = Intl.supportedValuesOf("timeZone");
// biome-ignore lint/correctness/noUnusedVariables: used in markup
let selectedTimezone = $state("Europe/Lisbon");

// biome-ignore lint/correctness/noUnusedVariables: used in markup
let isSubmitting = $state(false);

$effect(() => {
	selectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
});

// biome-ignore lint/correctness/noUnusedVariables: used in markup
const handleEnhance: SubmitFunction = () => {
	isSubmitting = true;
	return async ({ update }) => {
		await update();
		isSubmitting = false;
	};
};
</script>

<div class="max-w-2xl mx-auto p-6 bg-white shadow rounded-xl mt-10">
  <h1 class="text-3xl font-bold mb-6 text-green-700">Create an Event</h1>

  {#if form?.message}
    <div class="mb-4 p-4 bg-red-50 border-l-4 border-red-500 text-red-700">
      <p>{form.message}</p>
    </div>
  {/if}

  <form method="POST" use:enhance={handleEnhance} class="space-y-4">
    <div>
      <label class="block text-sm font-medium text-gray-700" for="title">Event Title</label>
      <input type="text" name="title" id="title" required value={form?.title ?? ""} class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500" placeholder="e.g. Project Kickoff">
    </div>

    <div>
      <label class="block text-sm font-medium text-gray-700" for="description">Description (optional)</label>
      <textarea name="description" id="description" rows="3" value={form?.description ?? ""} class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"></textarea>
    </div>

    <div class="grid grid-cols-2 gap-4">
      <div>
        <label class="block text-sm font-medium text-gray-700" for="startDate">Start Date</label>
        <input type="date" name="startDate" id="startDate" required value={form?.startDate ?? ""} class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500">
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700" for="endDate">End Date</label>
        <input type="date" name="endDate" id="endDate" required value={form?.endDate ?? ""} class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500">
      </div>
    </div>

    <div class="grid grid-cols-2 gap-4">
      <div>
        <label class="block text-sm font-medium text-gray-700" for="startHour">Daily Start Time (Optional)</label>
        <div class="mt-1 flex gap-2">
          <select name="startHour" id="startHour" value={form?.startHour ?? ""} class="block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500">
            <option value="">Any time</option>
            {#each Array.from({ length: 12 }) as _, i}
              <option value={i + 1}>{i + 1}:00</option>
            {/each}
          </select>
          <select name="startPeriod" value={form?.startPeriod ?? "AM"} class="block rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500">
            <option value="AM">AM</option>
            <option value="PM">PM</option>
          </select>
        </div>
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700" for="endHour">Daily End Time (Optional)</label>
        <div class="mt-1 flex gap-2">
          <select name="endHour" id="endHour" value={form?.endHour ?? ""} class="block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500">
            <option value="">Any time</option>
            {#each Array.from({ length: 12 }) as _, i}
              <option value={i + 1}>{i + 1}:00</option>
            {/each}
          </select>
          <select name="endPeriod" value={form?.endPeriod ?? "AM"} class="block rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500">
            <option value="AM">AM</option>
            <option value="PM">PM</option>
          </select>
        </div>
      </div>
    </div>

    <div>
      <label class="block text-sm font-medium text-gray-700" for="timezone">Timezone</label>
      <select name="timezone" id="timezone" required bind:value={selectedTimezone} class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500">
        {#each timezones as tz}
          <option value={tz}>{tz}</option>
        {/each}
      </select>
    </div>

    <button 
      type="submit" 
      disabled={isSubmitting}
      class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {#if isSubmitting}
        Creating Event...
      {:else}
        Create Event
      {/if}
    </button>
  </form>
</div>
