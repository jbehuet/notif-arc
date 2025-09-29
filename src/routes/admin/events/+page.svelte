<script>
    export let data;
</script>

<article>
    <header>
        <h1>Admin — Évènements</h1>
        {#if data.status === 401}
            <p class="contrast">Accès refusé (token invalide ou manquant).</p>
        {/if}
    </header>

    {#if data.status !== 401}
        <p>
            <strong>Total:</strong> {data.meta.total}
        </p>

        <ul>
            {#each data.events as s}
              <li><a href="{s[0]}" target="_blank">{s[1]}</a> {s[2]}</li>
            {/each}
        </ul>
    {/if}
</article>