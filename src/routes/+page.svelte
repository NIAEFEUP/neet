<script lang="ts">
	import TimeGrid from '$lib/components/TimeGrid.svelte';

	const now = new Date();
	const sampleEvents = [
		{
			id: '1',
			title: 'Team Standup',
			start: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 0),
			end: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 30)
		},
		{
			id: '2',
			title: 'Design Review',
			start: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 14, 0),
			end: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 15, 30)
		},
		{
			id: '3',
			title: 'Sprint Planning',
			start: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2, 10, 0),
			end: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2, 12, 0)
		}
	];
</script>

<TimeGrid events={sampleEvents} />
