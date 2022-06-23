Rails.application.routes.draw do
  root "home#index"

  resources :bnbs, only: [:index]

  get :villa, controller: :villa, action: :index
end
