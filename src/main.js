import { createApp } from 'vue'
import App from './App.vue'
import router from './router'

// Font Awesome (if using)
import { library } from '@fortawesome/fontawesome-svg-core'
import { faTasks, faBullhorn, faMap, faUsers, faCog, faEdit, faList, faBell, faSignOutAlt, faExclamationTriangle, faMapMarkedAlt } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'

library.add(faTasks, faBullhorn, faMap, faUsers, faCog, faEdit, faList, faBell, faSignOutAlt, faExclamationTriangle, faMapMarkedAlt)

const app = createApp(App)

app.component('font-awesome-icon', FontAwesomeIcon)
app.use(router)
app.mount('#app')