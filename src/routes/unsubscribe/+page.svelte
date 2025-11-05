<script>
    export let data;
</script>

<article>
    <h1>Se désinscrire</h1>
    <p class={data.status}>
        {data.message}
    </p>
    <a href="/" role="button">Retour à l’accueil</a>
</article>