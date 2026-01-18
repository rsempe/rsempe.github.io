source "https://rubygems.org"
git_source(:github) { |repo| "https://github.com/#{repo}.git" }

ruby "4.0.1"
gem "rails", "~> 8.1.0"
gem "sprockets-rails"
gem "pg", "~> 1.1"
gem "puma", ">= 5.0"
gem "jbuilder"
gem "mail_form"
gem "pry-rails"
gem "sass-rails"
gem "http_accept_language"

# Use JavaScript with ESM import maps [https://github.com/rails/importmap-rails]
gem "importmap-rails"

# Hotwire's SPA-like page accelerator [https://turbo.hotwired.dev]
gem "turbo-rails"

# Hotwire's modest JavaScript framework [https://stimulus.hotwired.dev]
gem "stimulus-rails"

# Windows does not include zoneinfo files, so bundle the tzinfo-data gem
gem "tzinfo-data", platforms: %i[ windows jruby ]

# Reduces boot times through caching; required in config/boot.rb
gem "bootsnap", require: false

group :development, :test do
  # See https://guides.rubyonrails.org/debugging_rails_applications.html#debugging-with-the-debug-gem
  gem "debug", platforms: %i[ mri windows ]
end

group :development do
  # Use console on exceptions pages [https://github.com/rails/web-console]
  gem "web-console"
  gem "capistrano"
  gem "capistrano-rails"
  gem "capistrano-passenger"
  gem "capistrano-rbenv"
  gem "capistrano-bundler"
  gem "ed25519"
  gem "bcrypt_pbkdf"
end

