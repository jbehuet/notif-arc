<script>
    import {CATEGORIES} from "$lib/shared/categories.js";

    export let data;

    async function handleDelete(category, url) {
        const res = await fetch('/api/events', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ category: category, url: url, token: data.token })
        });
        const result = await res.json();
        if (result.status === 200) window.location.reload();
    }
</script>

<article>
    <header>
        <h1>Admin — Souscriptions</h1>
        {#if data.status === 401}
            <p class="contrast">Accès refusé (token invalide ou manquant).</p>
        {/if}
    </header>

    {#if data.status !== 401}
        {#each CATEGORIES as category}
            <h5>{category.emoji} {category.label} ({data.events[category.slug].length})</h5>
            {#if !category.disabled}
                <table>
                    <thead>
                    <tr>
                        <th>Localisation</th>
                        <th>Date</th>
                        <th></th>
                    </tr>
                    </thead>
                    <tbody>
                    {#each data.events[category.slug] as event}
                        <tr>
                            <td><a href="{event.href}" target="_blank">{event.title}</a></td>
                            <td>{event.date.substring(1).replace("- Toute la journée", "")}</td>
                            <td><button onclick={() => handleDelete(category.slug, event.href)}>Supprimer</button></td>
                        </tr>
                    {/each}
                    </tbody>
                </table>
            {/if}
        {/each}
    {/if}
</article>