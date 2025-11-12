<script>
    import { page } from '$app/state';
    import { onMount } from 'svelte';

    let to;
    let event;

    onMount(async () => {
        const params = page.url.searchParams;
        to = params.get('to');
        event = params.get('event') ?? 'email_click';

        if (typeof window.umami !== 'undefined') {
            try {
                window.umami.track(event);
            } catch (err) {
                console.warn('Umami tracking error', err);
            }
        }

        setTimeout(() => {
            if (to) window.location.href = to;
            else window.location.href = '/';
        }, 200);
    });

</script>

<svelte:head>
    <title>Redirection...</title>
    <meta name="robots" content="noindex" />
</svelte:head>

<main class="container">
    <article class="redirect">
        <p class="no-margin"><em>Redirection en cours...</em></p>
        <small>Si rien ne se passe, <a href={to}>clique ici</a>.</small>
    </article>
</main>

