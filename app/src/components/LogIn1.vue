<template>
  <div class="e">
    <Transition>
      <h3 class="e1" v-if="show">{{ errormessage }}</h3>
    </Transition>
  </div>
  <div class="background">
    <div class="squares">
      <div class="square"></div>
      <div class="square"></div>
      <div class="square"></div>
      <div class="square"></div>
      <div class="square"></div>
      <div class="square"></div>
      <div class="square"></div>
      <div class="square"></div>
      <div class="square"></div>
      <div class="square"></div>
      <div class="square"></div>
      <div class="square"></div>
      <div class="square"></div>
      <div class="square"></div>
      <div class="square"></div>
      <div class="square"></div>
      <div class="square"></div>
      <div class="square"></div>
      <div class="square"></div>
      <div class="square"></div>
      <div class="square"></div>
      <div class="square"></div>
      <div class="square"></div>
      <div class="square"></div>
      <div class="square"></div>
      <div class="square"></div>
      <div class="square"></div>
      <div class="square"></div>
      <div class="square"></div>
      <div class="square"></div>
      <div class="square"></div>
      <div class="square"></div>
      <div class="square"></div>
      <div class="square"></div>
      <div class="square"></div>
      <div class="square"></div>
      <div class="square"></div>
      <div class="square"></div>
      <div class="square"></div>
      <div class="square"></div>
    </div>
    <div class="cursor" ref="cursor"></div>
  </div>
  <div class="overlay"></div>
  <div class="front" @mousemove="mouse">
    <div class="p"></div>
    <div class="logincontainer">
      <div class="sides"></div>
      <div class="loginview">
        <div class="log">
          <div class="l">PLEASE</div>
          <div class="l">LOG IN</div>
        </div>
        <form @submit.prevent="submit">
          <input type="text" placeholder="Email" v-model="email" required />
          <input type="text" placeholder="Password" v-model="password" required />
          <button type="submit" :disabled="loading">Login!</button>
        </form>
      </div>
      <div class="sides"></div>
    </div>
    <div class="p"></div>
  </div>
</template>
<script setup lang="ts">
import supabase from "@/supabase";
import { ref } from "vue";

const cursor = ref<HTMLElement | null>(null);
function mouse(e: MouseEvent) {
  if (cursor.value) {
    cursor.value.style.left = `${e.clientX}px`;
    cursor.value.style.top = `${e.clientY}px`;
  }
}

const emit = defineEmits(["login"]);

const email = ref("");
const password = ref("");
const loading = ref(false);
const errorMessage = ref("");

let show = ref(false);
let errormessage = ref("");

async function submit() {
  loading.value = true;
  errorMessage.value = "";

  try {
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
      email: email.value,
      password: password.value,
    });

    if (!loginError) {
      emit("login");
      return;
    }
    if (password.value.length >= 6) {
      const { data: signupData, error: signupError } = await supabase.auth.signUp({
        email: email.value,
        password: password.value,
      });

      if (signupError) throw signupError;

      const userId = signupData.user?.id;
      if (userId) {
        const { error: prefsError } = await supabase.from("user_preferences").insert({
          id: userId,
          options: {
            render: "8",
            brightness: "100",
          },
        });

        if (prefsError) throw prefsError;
      }
      emit("login");
    } else {
      errormessage.value = "Password too short, minimum requirement is 6 characters";
      show.value = true;
      setTimeout(() => {
        show.value = false;
      }, 3000);
    }
  } catch (error: any) {
    console.error("Auth error:", error);
    if ((error = "AuthApiError: User already registered")) {
      errormessage.value = "Wrong Password";
      show.value = true;
      setTimeout(() => {
        show.value = false;
      }, 3000);
    }
    errorMessage.value = error.message || "Something went wrong.";
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
/* ----------------------------error message----------------------------*/
.e {
  position: absolute;
  width: 100%;
  height: 3rem;
  top: 4%;
  left: 0%;
  padding: 0rem 15rem 0rem 15rem;
}
.e1 {
  text-align: center;
  width: 100%;
  height: 100%;
  color: white;
  background-color: #ff0061;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  font-weight: 550;
}
.v-enter-from {
  opacity: 0;
  transform: translateY(-90px);
}
.v-enter-active,
.v-leave-active {
  transition: all 0.5s ease;
}
.v-leave-to {
  opacity: 0;
  transform: translateY(-90px);
}
/* --------------------logged in = false-------------------- */

.front {
  z-index: 10;
  height: 100vh;
}
.login {
  height: 100%;
  width: 100%;
  position: absolute;
  top: 0%;
  left: 0%;
  z-index: 2;
}
.logincontainer {
  height: 37%;
  width: 100%;
  display: flex;
  flex-direction: row;
  justify-content: center;
}
.loginview {
  background-color: #1f1f1f;
  border-radius: 7px;
  height: 100%;
  width: 30%;
  box-shadow: 0 0 15px #7d7d7d;
}
.sides {
  width: 30%;
  height: 100%;
}
.p {
  height: 31.5%;
}
.log {
  font-size: 2.5rem;
  width: 100%;
  height: 15%;
  text-align: center;
  color: #f2f3f3;
  text-shadow: 0 0 15px #f2f3f3;
  margin: 5% 0 3% 0;
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: center;
}
.l {
  font-weight: 900;
}
.l:first-of-type {
  margin-bottom: -20px;
  margin-right: 12.5px;
}
form {
  display: flex;
  flex-direction: column;
  height: 85%;
  align-items: center;
}
input {
  margin-bottom: 1.5rem;
  padding: 0.2rem 1rem 0.2rem 1rem;
  border: 3px solid transparent;
  border-radius: 7px;
  background-color: #f4fdff;
  outline: none;
  color: #959697;
  transition: border-color 0.3s ease;
  width: 80%;
  height: 10%;
}
input:first-of-type {
  margin-top: 3rem;
}
input:focus {
  border: 3px solid rgba(31, 31, 31, 0.3);
  background-color: #ececec;
  transition: 0.2s;
}
input:active {
  border: 3px solid rgba(31, 31, 31, 0.55);
  transition: 0.2s;
}
input::placeholder {
  color: #1f1f1fb0;
  transition: 0.2s;
}
button {
  padding: 0.2rem 1rem 0.2rem 1rem;
  border: 3px solid transparent;
  border-radius: 7px;
  transition: border 0.3s ease;
  background-color: #f4fdff;
  color: #1f1f1fb0;
}
button:hover {
  border: 3px solid rgba(31, 31, 31, 0.3);
  transition: 0.1s;
}
button:active {
  border: 3px solid rgba(31, 31, 31, 0.55);
  background-color: #ececec;
  transition: 0.1s;
}

/* --------------------background--------------------- */

.background {
  height: 100vh;
  width: 100vw;
  z-index: -1;
  position: absolute;
  display: flex;
  flex-wrap: wrap;
  flex-direction: row;
  overflow: hidden;
  background-color: #1f1f1f;
}
.overlay {
  z-index: -1;
  background: radial-gradient(circle, #ffffff00 60%, #000000e2 90%, #000000 99%);
  height: 100%;
  width: 100%;
  position: absolute;
}
.squares {
  height: auto;
  width: 100%;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  flex-direction: row;
}
.square {
  box-sizing: border-box;
  background-color: #dfe4e7;
  background-image: url(../src/assets/grass.png);
  border-radius: 7px;
  margin: 1vh;
  width: 11.5%;
  height: 11.5vw;
  background-size: cover;
  z-index: 1;
}
.cursor {
  position: absolute;
  height: 40vh;
  width: 40vh;
  background: radial-gradient(
    circle closest-side,
    rgba(47, 172, 15, 1) 0%,
    rgba(46, 172, 15, 0.708) 50%,
    rgba(46, 172, 15, 0.447) 59%,

    rgba(255, 255, 255, 0) 70%,
    rgba(255, 255, 255, 0) 100%
  );
  z-index: 0;
  border-radius: 50%;
  top: 23%;
  left: 73%;
  transform: translate(-50%, -50%);
}
@media screen and (max-width: 1300px) {
  .square {
    width: 13.1%;
    height: 13.1vw;
  }
}
@media screen and (max-width: 1244px) {
  .square {
    width: 15.3%;
    height: 15.3vw;
  }
}
@media screen and (max-width: 1079px) {
  .square {
    width: 18.4%;
    height: 18.4vw;
  }
  .log {
    font-weight: 800;
    font-size: 2.2rem;
  }
}
@media screen and (max-width: 922px) {
  .square {
    width: 18%;
    height: 18vw;
  }
}
@media screen and (max-width: 873.6px) {
  .l:first-of-type {
    margin-right: 0;
    width: 100%;
  }
}
@media screen and (max-width: 738px) {
  .square {
    width: 22.4%;
    height: 22.4vw;
  }
}
@media screen and (max-width: 570px) {
  .square {
    width: 30%;
    height: 30vw;
  }
}
@media screen and (max-width: 443px) {
  .square {
    width: 29.5%;
    height: 29.5vw;
  }
}
@media screen and (max-width: 390px) {
  .square {
    width: 46%;
    height: 46vw;
  }
}
@media screen and (max-width: 370px) {
  .square {
    width: 44%;
    height: 44vw;
  }
}
</style>
