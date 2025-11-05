<script>
    export let data;
</script>

<main class="container">
    <article>
        <header>
            <strong>Se désinscrire</strong>
            <span>🚫</span>
        </header>
        <p class={data.status}>
            {data.message}
        </p>
        <a href="/" role="button" class="outline">Retour à l’accueil</a>
    </article>
</main>