export default {
  server: {
    host: '0'
  },
  router: {
    base: '/cuteboi/'
  },
  ssr: false,
  target: 'static',
  head: {
    title: 'CuteBoi Tracker',
    htmlAttrs: {
      lang: 'en'
    },
    meta: [
      {charset: 'utf-8'},
      {property: 'og:title', content: 'CuteBoi Tracker'},
      {property: 'twitter:title', content: 'CuteBoi Tracker'},
      {property: 'og:description', content: 'Tracks software supply chain threat actor which has published 550 malicious packages'},
      {property: 'twitter:description', content: 'Tracks software supply chain threat actor which has published 550 malicious packages'},
      {property: 'og:image', content: 'https://user-images.githubusercontent.com/1287098/176996895-eff73dce-13c2-4827-8e76-ada110406cc5.png'},
      {property: 'twitter:image', content: 'https://user-images.githubusercontent.com/1287098/176996895-eff73dce-13c2-4827-8e76-ada110406cc5.png'},
      {name: 'viewport', content: 'width=device-width,initial-scale=1.0'},
      {"http-equiv": 'X-UA-Compatible', content: 'IE=edge'},
      {hid: 'description', name: 'description', content: ''},
    ],
    link: [
      {rel: 'icon', type: 'image/x-icon', href: '/favicon.svg'}
    ]
  },
  css: [],
  plugins: [],
  components: true,
  buildModules: [],
  modules: [
    '@nuxtjs/axios',
  ],
  axios: {
    baseURL: '/',
  },
  build: {}
}
