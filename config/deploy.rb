# config valid for current version and patch releases of Capistrano
lock "~> 3.17.0"

set :application, "Ruby42"
set :repo_url, "git@bitbucket.org:rsempe/gites-les-celestins.git"
set :rbenv_ruby, "3.1.1"
set :branch, ENV['BRANCH'] || "main"
set :deploy_to, '/home/leman/sites/lescelestins'
set :user, 'leman'
set :log_level, :info
set :passenger_restart_with_touch, true
set :linked_files, %w{config/master.key}
