# Be sure to restart your server when you modify this file.

# Version of your assets, change this if you want to expire all your assets.
Rails.application.config.assets.version = "1.0"

# Add additional assets to the asset load path.
Rails.application.config.assets.paths << Rails.root.join("app/javascript")

# Precompile additional assets.
Rails.application.config.assets.precompile += %w[
  jquery-1.11.2.min.js
  common_scripts_min.js
  validate.js
  functions.js
  greensock.js
  layerslider.transitions.js
  layerslider.kreaturamedia.jquery.js
  vegas.js
]
