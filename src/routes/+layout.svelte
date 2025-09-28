<script>
	import '$styles/main.scss';
</script>
<header class="container">
    <nav>
        <ul><li class="item-center"><img src="/notif-arc-logo-512.png" width="56" /><strong>NotifArc</strong></li></ul>
    </nav>
</header>

<main class="container">
    <slot />
</main>

<footer class="container">
    <small>par Jerome B. © {new Date().getFullYear()} — NotifArc</small>
</footer>