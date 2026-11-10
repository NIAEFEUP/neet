<script lang="ts">
import StarIcon from "@lucide/svelte/icons/star";
import { resolve } from "$app/paths";
import logo from "$lib/assets/favicon.svg";
import nifeupLogo from "$lib/assets/nifeup.svg";
import AsciiAvailability from "$lib/components/home/AsciiAvailability.svelte";
import { Button } from "$lib/components/ui/button";
import { ButtonGroup } from "$lib/components/ui/button-group";
import type { PageProps } from "./$types";
import "./home.css";

let { data }: PageProps = $props();

const repositoryUrl = "https://github.com/NIAEFEUP/neet";
</script>

<svelte:head>
	<title>neet: Find a time together</title>
	<meta name="description" content="Find a time that works for everyone. Create an event, share your availability, and bring your schedules together." />
	<meta name="theme-color" content="#f8f9fb" />
</svelte:head>

<div class="neet-home">
	<header class="home-header home-container">
		<a class="home-wordmark" href={resolve("/")} aria-label="neet home">
			<img src={logo} alt="" width="28" height="28" />
			<span>neet</span>
		</a>
	</header>

	<section class="home-hero home-container" aria-labelledby="home-title">
		<div class="hero-copy">
			<h1 id="home-title">Many schedules,<br />one time.</h1>
			<p class="hero-lead">Find a time that works for everyone.</p>
			<a class="create-key" href={resolve("/create")}>Create an Event</a>
		</div>
		<AsciiAvailability />
	</section>

	<footer class="home-footer home-container">
		<div class="github-links">
			<a class="github-link footer-link" href={repositoryUrl} target="_blank" rel="noreferrer">GitHub</a>
			<ButtonGroup>
				<Button
					variant="outline"
					href={repositoryUrl}
					target="_blank"
					rel="noreferrer"
					aria-label="Star neet on GitHub"
				>
					<StarIcon />
					Star
				</Button>
				{#if data.githubStars !== null}
					<Button
						variant="outline"
						href="https://github.com/NIAEFEUP/neet/stargazers"
						target="_blank"
						rel="noreferrer"
						aria-label={`${data.githubStars} GitHub stars`}
						class="tabular-nums"
					>
						{data.githubStars.toLocaleString("en")}
					</Button>
				{/if}
			</ButtonGroup>
		</div>
		<a class="nifeup-link" href="https://nifeup.com" target="_blank" rel="noreferrer" aria-label="Visit nifeup">
			<img src={nifeupLogo} alt="nifeup" width="60" height="19" />
		</a>
	</footer>
</div>
