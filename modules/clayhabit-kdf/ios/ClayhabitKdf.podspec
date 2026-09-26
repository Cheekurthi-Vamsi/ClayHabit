Pod::Spec.new do |s|
  s.name           = 'ClayhabitKdf'
  s.version        = '1.0.0'
  s.summary        = 'Native PBKDF2-HMAC-SHA256 for ClayHabbit'
  s.license        = 'MIT'
  s.author         = 'ClayHabbit'
  s.homepage       = 'https://github.com/expo/expo'
  s.platforms      = { :ios => '16.4' }
  s.swift_version  = '5.9'
  s.source         = { git: '' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.source_files = '**/*.{h,m,swift}'
end
