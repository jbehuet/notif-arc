<script>
	import '$styles/main.scss';
</script>
<header class="container">
    <nav>
        <ul><li><a href="/" class="item-center"><img src="/notif-arc-logo-512.png" width="68" /><strong>NotifArc</strong></a></li></ul>
    </nav>
</header>

<main class="container">
    <slot />
    <footer class="container">
        <small>par Jerome B. © {new Date().getFullYear()} — NotifArc</small>
    </footer>
</main>