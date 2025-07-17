// --- DOM elements ---
const randomBtn = document.getElementById("random-btn");
const recipeDisplay = document.getElementById("recipe-display");

// This function creates a list of ingredients for the recipe from the API data
// It loops through the ingredients and measures, up to 20, and returns an HTML string
// that can be used to display them in a list format
// If an ingredient is empty or just whitespace, it skips that item 
function getIngredientsHtml(recipe) {
  let html = "";
  for (let i = 1; i <= 20; i++) {
    const ing = recipe[`strIngredient${i}`];
    const meas = recipe[`strMeasure${i}`];
    if (ing && ing.trim()) html += `<li>${meas ? `${meas} ` : ""}${ing}</li>`;
  }
  return html;
}

// This function displays the recipe on the page
function renderRecipe(recipe) {
  recipeDisplay.innerHTML = `
    <div class="recipe-title-row">
      <h2>${recipe.strMeal}</h2>
    </div>
    <img src="${recipe.strMealThumb}" alt="${recipe.strMeal}" />
    <h3>Ingredients:</h3>
    <ul>${getIngredientsHtml(recipe)}</ul>
    <h3>Instructions:</h3>
    <p>${recipe.strInstructions.replace(/\r?\n/g, "<br>")}</p>
  `;
}

// This function gets a random recipe from the API and shows it
async function fetchAndDisplayRandomRecipe() {
  recipeDisplay.innerHTML = "<p>Loading...</p>"; // Show loading message
  try {
    // Fetch a random recipe from the MealDB API
    const res = await fetch('https://www.themealdb.com/api/json/v1/1/random.php'); // Replace with the actual API URL
    const data = await res.json(); // Parse the JSON response
    const recipe = data.meals[0]; // Get the first recipe from the response
    // Show the recipe on the page
    renderRecipe(recipe);

    // Add a Save button below the recipe
    const saveBtn = document.createElement("button");
    saveBtn.textContent = "Save Recipe";
    saveBtn.className = "main-btn";
    saveBtn.style.marginTop = "10px";
    recipeDisplay.appendChild(saveBtn);

    // When Save button is clicked, save the recipe
    saveBtn.onclick = function() {
      saveRecipe(recipe);
    };

    window.currentRecipe = recipe; // Store globally for remixing

  } catch (error) {
    recipeDisplay.innerHTML = "<p>Sorry, couldn't load a recipe.</p>";
  }
}

// This function saves a recipe to localStorage and updates the saved recipes list
function saveRecipe(recipe) {
  // Get saved recipes from localStorage, or start with an empty array
  let saved = JSON.parse(localStorage.getItem("savedRecipes") || "[]");
  // Add the new recipe to the array
  saved.push({
    id: recipe.idMeal,
    name: recipe.strMeal,
    thumb: recipe.strMealThumb
  });
  // Save back to localStorage
  localStorage.setItem("savedRecipes", JSON.stringify(saved));
  // Update the saved recipes list on the page
  showSavedRecipes();
}

// This function shows the saved recipes in the Saved Recipes section
function showSavedRecipes() {
  const container = document.getElementById("saved-recipes-container");
  const list = document.getElementById("saved-recipes-list");
  let saved = JSON.parse(localStorage.getItem("savedRecipes") || "[]");
  if (saved.length === 0) {
    container.style.display = "none";
    return;
  }
  container.style.display = "block";
  list.innerHTML = "";
  saved.forEach((recipe, idx) => {
    const li = document.createElement("li");
    li.style.position = "relative";
    // Make the recipe name clickable
    const nameSpan = document.createElement("span");
    nameSpan.textContent = recipe.name;
    nameSpan.style.cursor = "pointer";
    nameSpan.style.marginLeft = "8px";
    nameSpan.onclick = async function() {
      // Show loading message
      recipeDisplay.innerHTML = "<p>Loading recipe...</p>";
      try {
        // Fetch recipe details by name from MealDB
        const res = await fetch(`https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(recipe.name)}`);
        const data = await res.json();
        if (data.meals && data.meals.length > 0) {
          window.currentRecipe = data.meals[0]; // For remixing
          renderRecipe(data.meals[0]);
          // Add Save button again
          const saveBtn = document.createElement("button");
          saveBtn.textContent = "Save Recipe";
          saveBtn.className = "main-btn";
          saveBtn.style.marginTop = "10px";
          recipeDisplay.appendChild(saveBtn);
          saveBtn.onclick = function() {
            saveRecipe(data.meals[0]);
          };
        } else {
          recipeDisplay.innerHTML = "<p>Recipe not found.</p>";
        }
      } catch (error) {
        recipeDisplay.innerHTML = "<p>Sorry, couldn't load the recipe.</p>";
      }
    };
    li.innerHTML = `<img src="${recipe.thumb}" alt="${recipe.name}" style="height:40px;vertical-align:middle;">`;
    li.appendChild(nameSpan);
    // Create the delete button
    const delBtn = document.createElement("button");
    delBtn.textContent = "✕";
    delBtn.title = "Delete";
    delBtn.className = "delete-btn";
    delBtn.style.position = "absolute";
    delBtn.style.right = "8px";
    delBtn.style.top = "50%";
    delBtn.style.transform = "translateY(-50%)";
    delBtn.style.background = "transparent";
    delBtn.style.border = "none";
    delBtn.style.color = "#888";
    delBtn.style.fontSize = "20px";
    delBtn.style.cursor = "pointer";
    delBtn.onmouseover = function() { delBtn.style.color = "#e74c3c"; };
    delBtn.onmouseout = function() { delBtn.style.color = "#888"; };
    delBtn.onclick = function() {
      saved.splice(idx, 1);
      localStorage.setItem("savedRecipes", JSON.stringify(saved));
      showSavedRecipes();
    };
    li.appendChild(delBtn);
    list.appendChild(li);
  });
}

// --- Remix Recipe Functionality ---
// This function sends the current recipe and remix theme to OpenAI and displays the remixed recipe
async function remixRecipeWithAI(recipe, theme) {
  // Show a fun and friendly loading message while waiting for AI
  const remixOutput = document.getElementById("remix-output");
  const loadingMessages = [
    "Mixing up your culinary magic...",
    "The chef is putting on their creative hat!",
    "Whisking up a tasty twist...",
    "Remixing your recipe for a delicious surprise!",
    "Hang tight! The AI chef is cooking up something fun..."
  ];
  // Pick a random loading message
  const msg = loadingMessages[Math.floor(Math.random() * loadingMessages.length)];
  remixOutput.innerHTML = `<p>${msg}</p>`;

  // Build the prompt for OpenAI
  const prompt = `Remix this recipe in a short, fun, creative, and doable way. Highlight any changed ingredients or instructions.\n\nRemix theme: ${theme}\n\nRecipe JSON:\n${JSON.stringify(recipe, null, 2)}`;

  // Prepare the request body for OpenAI Chat Completions API
  const body = {
    model: "gpt-4.1",
    messages: [
      { "role": "system", "content": "You are a creative chef remixing recipes for beginners. Keep it short, fun, and easy to follow." },
      { "role": "user", "content": prompt }
    ],
    max_tokens: 400
  };

  try {
    // Send the request to OpenAI
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify(body)
    });
    const result = await response.json();
    // Get the AI's reply
    const aiText = result.choices && result.choices[0] && result.choices[0].message.content ? result.choices[0].message.content : "Sorry, couldn't remix the recipe.";
    // Show the remixed recipe
    remixOutput.innerHTML = `<div class='remix-result'>${aiText.replace(/\n/g, "<br>")}</div>`;
  } catch (error) {
    remixOutput.innerHTML = "<p>Sorry, something went wrong remixing your recipe.</p>";
  }
}

// --- Event listener for Remix button ---
const remixBtn = document.getElementById("remix-btn");
const remixThemeSelect = document.getElementById("remix-theme");

remixBtn.addEventListener("click", function() {
  // Get the currently displayed recipe from the last API call
  // We'll store it in a global variable when we fetch it
  if (window.currentRecipe) {
    const theme = remixThemeSelect.value;
    remixRecipeWithAI(window.currentRecipe, theme);
  } else {
    document.getElementById("remix-output").innerHTML = "<p>No recipe to remix yet!</p>";
  }
});

// --- Event listeners ---

// When the button is clicked, get and show a new random recipe
randomBtn.addEventListener("click", fetchAndDisplayRandomRecipe);

// When the page loads, show a random recipe right away
window.addEventListener("DOMContentLoaded", function() {
  fetchAndDisplayRandomRecipe();
  showSavedRecipes();
});