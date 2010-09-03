require 'rubygems'
require 'rake'
require 'pdoc'

OUTPUT_DIR = File.join(File.dirname(__FILE__), 'doc', 'html')

desc "Builds the documentation"
task :build_doc do
  PDoc.run({
    :source_files => [File.join(File.dirname(__FILE__), 'lib', 'irc.js')],
    :destination => OUTPUT_DIR,
    :syntax_highlighter => :pygments,
    :markdown_parser => :maruku,
    :src_code_href => proc { |file, line|
      "http://github.com/gf3/IRC-js/#{file}##{line}"
    },
    :pretty_urls => true,
    :bust_cache => true,
    :name => 'IRC-js | An IRC library for node.js',
    :short_name => 'IRC-js',
    :home_url => 'http://github.com/gf3/IRC-js',
    :doc_url => 'http://gf3.github.com/IRC-js/',
    :version => "0.2.0",
    :copyright_notice => 'This work is <a href="http://github.com/gf3/IRC-js/blob/master/UNLICENSE">UNLICENSED</a>.'
  })
end

desc "Empties output directory"
task :remove_doc do
  rm_rf Dir.glob(File.join(OUTPUT_DIR, "*"))
end

desc "Empties the output directory and builds the documentation."
task :doc => [:remove_doc, :build_doc]

