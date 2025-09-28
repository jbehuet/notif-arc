<script >
export let data;
</script>

<article>
    <h1>{data.title}</h1>
    <p>{data.message}</p>
    {#if data.email}<blockquote><strong>{data.email}</strong></blockquote>{/if}
    <a href="/" role="button">Retour à l’accueil</a>
</article>
