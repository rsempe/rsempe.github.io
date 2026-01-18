# config valid for current version and patch releases of Capistrano
lock "~> 3.20.0"

set :application, "Ruby42"
set :repo_url, "git@github.com:rsempe/gites-les-celestins.git"
set :rbenv_ruby, "4.0.1"
set :branch, ENV['BRANCH'] || "main"
set :deploy_to, '/home/leman/sites/lescelestins'
set :user, 'leman'
set :log_level, :info
set :passenger_restart_with_touch, true
set :linked_files, %w{config/master.key}
set :bundle_config, { force_ruby_platform: true }
