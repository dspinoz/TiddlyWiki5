#!/usr/bin/env python

import os
import re

tiddlers = []

regex_tags = re.compile('(.*): (.*)')

# traverse root directory, and list directories as dirs and files as files
for root, dirs, files in os.walk("."):
  path = root.split(os.sep)
  for file in files:
    if re.match('.*\.tid$', file):
      tiddlers.append(os.path.join(root, file))

for t in tiddlers:
  #print t
  with open(t) as f:
    lines = f.readlines()
    time = False
    tags = {}
    for l in lines:
      if len(l) <= 1:
        break
      m = regex_tags.match(l)
      if m is not None:
        #print m.group(1),m.group(2)
        if m.group(1) == "tags":
          tags_split = m.group(2).split()
          for tag in tags_split:
            if tag == "time-entry":
              time = True
        else:
          if m.group(1) in tags:
            print "Error: Overwriting", m.group(1),"(",tags[m.group(1)],") with",m.group(2)
          tags[m.group(1)] = m.group(2)
    if time:
      for k in tags:
        if k != "title" and k != "modified" and k != "type" and k != "created" and k != "creator" and k != "modifier":
          print "%s,%s,%s,%s" %(t,tags['title'],k,tags[k])