<script setup lang="ts">
import { RouterLink, RouterView } from "vue-router";
import { ref } from "vue";
import LogIn from "./components/LogIn1.vue";
import supabase from "./supabase";

const loggedin = ref(false);
const wantstologin = ref(false);
const open = ref(false);
const errorMessage = ref("");
let useremail = ref<string | null>(null) ?? "Guest";

let data = ref([]);
// let x = true;
// while (x) {
// setTimeout(() => {}, 1000);

//--------------------------------------------------------------settings
let renderD = ref(8);
let brightnessV = ref(100);
//-----------------------------------------------

async function userdata() {
  if (loggedin.value) {
    try {
      const { data, error } = await supabase.auth.getUser();
      if (error) throw error;
      if (data?.user) {
        loggedin.value = true;
        useremail.value = data.user.email ?? null;
        const { data: odata, error: oerror } = await supabase
          .from("user_preferences")
          .select("options")
          .eq("id", data.user.id)
          .single();
        if (oerror) {
          console.log("Error", oerror.message);
        }
        if (odata?.options) {
          renderD.value = odata.options.render;
          brightnessV.value = odata.options.brightness;
        }
      }
    } catch (err) {
      console.error("Error getting user:", err);
    }
  }
}

function spin(event: MouseEvent) {
  event.stopPropagation(); // prevent triggering document click
  open.value = !open.value;
}
function close() {
  if (open.value) open.value = false;

  update();
}
function forbuttons() {
  if (open.value) {
    close();
  }
}
async function logout() {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    useremail.value = null;
    renderD.value = 8;
    brightnessV.value = 100;
    console.log(useremail);
    console.log("Signed out successfully.");
  } catch (error: any) {
    console.error("Sign-out error:", error);
    errorMessage.value = error.message || "Failed to sign out.";
  }
}
async function update() {
  if (loggedin.value) {
    console.log("passed check");
    updatePreferences();
  } else {
    console.log("not logged in, no user preferences updated");
  }
}

async function updatePreferences() {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  console.log(data, userError);

  if (userError || !user) {
    console.error("Error fetching user:", userError?.message);
    return;
  }

  const { error: prefsError } = await supabase.from("user_preferences").upsert({
    id: user.id,
    options: {
      render: renderD.value,
      brightness: brightnessV.value,
    },
  });

  if (prefsError) {
    console.error("Error updating preferences:", prefsError.message);
  } else {
    console.log("Preferences updated successfully");
  }
}
</script>

<template>
  <div class="login" v-if="wantstologin">
    <LogIn @login="(loggedin = true), (wantstologin = false), userdata(), console.log(useremail)" />
  </div>
  <div v-else-if="!wantstologin || loggedin">
    <div class="overlay" v-if="open" @click="close()"></div>

    <header>
      <div class="wrapper">
        <nav>
          <button class="account">
            <img src="./assets/grass.png" alt="Account" :class="{ rotated: open }" @click="spin" />
          </button>

          <Transition name="fade-slide">
            <div
              class="dropdown"
              v-if="open"
              @click="(event: MouseEvent) => event.stopPropagation()"
            >
              <div class="youraccount">
                <div class="topheader">
                  <div class="header" v-if="loggedin">
                    <h1 style="font-weight: 700">Your Account:</h1>

                    <div class="containsemail">
                      <h3>{{ useremail }}</h3>
                      <div id="border" v-if="loggedin">
                        <a
                          href=""
                          @click.prevent="
                            (loggedin = false), (wantstologin = false), logout(), forbuttons()
                          "
                          >Log out</a
                        >
                      </div>
                    </div>
                  </div>

                  <div class="header" v-else>
                    <h1>Please Log In To See Your Account</h1>
                  </div>
                </div>
              </div>

              <div class="settings">
                <h2 class="h2settings" style="font-weight: 700">Settings</h2>
                <div class="mainsettings">
                  <div class="render">
                    <h2>Render Distance:</h2>
                    <input
                      type="range"
                      min="1"
                      max="16"
                      value="8"
                      class="slider"
                      v-model="renderD"
                    />
                    <h3>{{ renderD }}</h3>
                  </div>
                  <div class="brightness">
                    <h2>Brightness:</h2>
                    <input
                      type="range"
                      min="10"
                      max="200"
                      value="100"
                      class="slider"
                      v-model="brightnessV"
                    />
                    <h3>{{ brightnessV }}</h3>
                  </div>
                </div>
              </div>

              <div style="transform: translateY(-15px)" v-if="!loggedin">
                <h4>In order to save your settings, please log in</h4>
              </div>
            </div>
          </Transition>

          <div class="main">
            <div class="border">
              <RouterLink to="/" @click.prevent="forbuttons()">Home</RouterLink>
            </div>
            <div class="border">
              <RouterLink to="/about" @click.prevent="forbuttons()">About</RouterLink>
            </div>

            <div class="border">
              <a
                href=""
                @click.prevent="
                  console.log('this is loggedin value:', loggedin);
                  console.log('this is wantstologin value:', wantstologin);
                  console.log('this is open value:', open);
                "
                >Test</a
              >
            </div>
            <div class="border" v-if="!loggedin">
              <a href="" @click.prevent="(wantstologin = true), forbuttons()">Log in</a>
            </div>
          </div>
        </nav>
      </div>
    </header>
    <RouterView />
  </div>
</template>

<!-- simplest solution: @click.stop -->

<style scoped>
.topheader {
  width: 100%;
  padding-bottom: -5%;
  display: flex;
  justify-content: center;
}

.h2settings {
  margin: 10px 0px 10px 0px;
}
.slider {
  appearance: none;
  -webkit-appearance: none;
  width: 90%;
  height: 10px;
  background: #dadada;
  border-radius: 7px;
  outline: none;
  transition: background 0.3s;
}

.slider:hover {
  background: #ccc;
}

.slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 20px;
  height: 20px;
  background: #525252;
  cursor: pointer;
  border-radius: 50%;
  border: none;
  box-shadow: 0 0 2px rgba(0, 0, 0, 0.5);
}

/* --------------------logged in = true-------------------- */
/* .centerhorizontally {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
} */
.containsemail {
  display: flex;
  flex-direction: row;
  justify-content: center;
  gap: 7%;
  width: 100%;
  margin-bottom: 7px;
  align-items: center;
}

#border {
  width: 25%;
}
#border a {
  width: 100%;
  padding: 0;
}
.overlay {
  height: 100vh;
  width: 100vw;
  position: fixed;
  background-color: rgba(178, 255, 243, 0);
  top: 0%;
  left: 0%;
  z-index: 10;
}

.settings {
  height: 80%;
}

.fade-slide-enter-from,
.fade-slide-leave-to {
  opacity: 0;
  color: #1f1f1f;
  transform: translate(-17vw, 45px) !important;
}
.fade-slide-enter-active {
  transition: all 0.3s ease-out;
}
.wrapper {
  width: 98%;
  height: 100%;
  border-bottom: 1px solid #dfe4e7;
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.account {
  height: 100%;
  background: none;
  border: none;
  padding: 0;
  margin-right: 1rem;
  display: flex;
  align-items: center;
  position: absolute;
  z-index: 11;
}
.account img {
  height: 35px;
  width: 35px;
  object-fit: cover;
  border-radius: 5px;
  transform-origin: center;
  /* image-rendering: crisp-edges; */
  transition: 0.3s ease-out;
}
.account img:hover:not(.rotated) {
  transform: scale(1.3);
}
.account img.rotated {
  transform: rotate(90deg);
}
.account img.rotated:hover {
  transform: rotate(90deg) scale(1.3);
}
.dropdown {
  height: 75vh;
  width: 25vw;
  position: absolute;
  transform: translateY(39px);
  background-color: #1f1f1f;
  box-shadow: 0 0 7px #dadada;
  border-radius: 5px;
  transition: 0.3s ease-out;
  top: 0%;
  left: 0%;
  z-index: 11;
}
.account:hover + .dropdown {
  transform: translate(-5.5px, 44px);
}
.youraccount {
  height: 15%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}
.header {
  height: 100%;
  border-bottom: 0px solid #ffffff;
  box-shadow: 0 3px 3px -3px #dadada;
  width: 95%;
  border-radius: 3px;
}
.main {
  width: 100%;
  height: 100%;
  align-items: center;
  z-index: 10;
}
/* .accountimg: */
/* .v-enter-from,
.v-leave-to {
  transform: rotate(0deg);
}
.v-enter-to,
.v-leave-from {
  transform: rotate(270deg);
}
.v-enter-active,
.v-leave-active {
  transition: all 0.7s ease-out;
} */
/* --------------------buttons-------------------- */
header {
  line-height: 1.5;
  height: 7vh;
  display: flex;
  flex-direction: row;
  justify-content: center;
}
nav {
  display: flex;
  flex-direction: row;
  height: 50%;
  width: 100%;
  font-size: 12px;
  text-align: center;
  position: relative;
}

nav a.router-link-exact-active {
  color: #dfe4e7;
  background-color: #1f1f1f;
  border: 2px solid #dfe4e7;
}
a {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 0 1rem;
  background-color: #dadada;
  color: black;
  text-decoration: none;
  font-weight: 500;
  border-radius: 5px;
  width: 120px;
  transition: border-color 0.3s ease, background-color 0.5s ease;
}
a:hover {
  color: lightgrey;
  background-color: #8b8b8b;
  border: 1px solid #dfe4e7;
}
a:focus {
  background-color: #525252;
}
.border {
  display: inline-block;
  padding: 0 0.125rem;
  border-left: 1.5px solid var(--color-border);
  text-decoration: none;
  height: 100%;
  z-index: 11;
}

.border:first-of-type {
  border: 0;
}
</style>
<!-- #aaedee  -->
<!-- #ddaadd  -->
