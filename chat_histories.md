# Chat History

## A. user_stories.md
### Init Ask
please act as Product Manager, ask clarifying question if necessary. at the end, turn this into user_stories.md

- I want to build a web app (mobile) where you can login with user and pin.
- You can input Recipe, the title, ingredient, serving size, and body containing step by step instruction
- Ingredient have name, qty and unit
- You can also plan meal where you choose the recipe and date, with an option to input custom serving size (auto calculate the ingredient need).
- There's prep ingredient page where you select multiple meal plan and will generate how many ingredient you need. You can input what you have, adjust increase or decrease
- The list of ingredient you have is store also stored so later in prep ingredient it will show last stock.. 
- When you flag meal to be Cooked, the ingredient stock is substracted

### I select options from claude
### Claude plan user_stories and discover some open question

### Answering open Question
1. exact unit + spoon is fine
2. sync for planned, oh if the meal is past date, it will turn into uncooked
3. flag recipe as trashed, when meal is not planned anymore, remove it from the list (soft deleted)
4. single, there's option for conversion when read or write
5. can't change it back. user may need confirmation button for this kind of action
6. calender shows weekly, but you can freely choose how long is plan window
7.  explicit
8. non blocking

### Claude wite the plan, there's other open question that can be answer on build phase

### Answering open question Part 2
1. Manual insert/update in DB
2. numeric only, length min/max 8. unlimited attempt
3. English

oh and please change Uncooked to NotCooked wdyt?

### End Chat

## B. mvp_feature.md
### init ask
please act as System architect, ask clarifying quesiton, keep system simple

based on @docs/user_stories.md , please write mvp_feature_spec.md, we're gonna use vite (bundled to html, css, js) as the frontend, no BE, user data is saved to localstorage. skip login and add export/import (json) data

### I select options from claude
### Claude generate the spec
### End Chat

## C. readme.md
### init ask
based on @docs/1_user_stories.md @docs/mvp_feature_spec.md , please fill project description on README.md

### Claude update the readme
### End Chat