<template>
  <div class="loading">로그인 처리 중입니다...</div>
</template>

<script>
export default {
  mounted() {
    const code = this.$route.query.code
    if (!code) {
      this.$router.replace({ name: 'login' }) // 없으면 로그인으로 튕김
      return
    }

    // 백엔드로 code 넘기기
    this.$http.get(`/api/oauth/callback/?code=${code}`)
      .then(() => {
        this.$store.dispatch('getProfile') // 로그인 상태 갱신
        this.$router.replace({ name: 'home' }) // 메인으로 이동
      })
      .catch(() => {
        this.$router.replace({ name: 'login' })
      })
  }
}
</script>